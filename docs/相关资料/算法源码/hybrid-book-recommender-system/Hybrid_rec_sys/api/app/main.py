import io
import pandas as pd

from typing import Optional
from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import StreamingResponse
from app.models import RecommendRequest, RecommendResponse, Recommendation
from app.rec_pipeline import generate_recommendations
from app.artifacts_loader import load_books_df, load_features_light
from app.utils import get_book_title_mapping, get_genres_mapping, format_book_metadata
from app.logger import logger

app = FastAPI(
    title="📚 Гибридная рекомендательная система по книгам",
    description="FastAPI-интерфейс для гибридной рекомендательной системы (контент + ALS + CatBoost)",
    version="1.0.0"
)


@app.get("/")
def root():
    logger.info("Запрос на корневой endpoint /")
    return {"message": "Рекомендательная система работает. См. /docs для API."}


@app.get("/genres")
def get_all_genres():
    logger.info("Запрос на получение всех жанров /genres")
    genres_map = get_genres_mapping()
    all_genres = sorted({genre for genre_list in genres_map.values() for genre in genre_list})
    return {"genres": all_genres}


@app.post("/recommend", response_model=RecommendResponse)
def recommend(request: RecommendRequest):
    logger.info(f"Получен запрос /recommend с данными: {request.dict()}")
    try:
        response = generate_recommendations(request)
        logger.info(f"Сгенерировано {len(response.recommendations)} рекомендаций")
        return response
    except Exception as e:
        logger.exception("Ошибка при обработке /recommend")
        raise HTTPException(status_code=500, detail="Ошибка при генерации рекомендаций")


@app.post("/recommend_csv")
def recommend_csv(request: RecommendRequest):
    logger.info("Запрос на /recommend_csv")
    response = generate_recommendations(request)

    if not response.recommendations:
        logger.warning("⚠Нет подходящих рекомендаций — CSV не будет создан")
        raise HTTPException(status_code=404, detail="Нет подходящих рекомендаций")

    df = pd.DataFrame([{
        "book_id": r.book_id,
        "title": r.title,
        "score": r.score,
        "genres": r.genres or "",
        "image_url": r.image_url,
        "rating": r.rating
    } for r in response.recommendations])

    logger.info("CSV-файл с рекомендациями успешно сформирован")

    stream = io.StringIO()
    df.to_csv(stream, index=False)
    stream.seek(0)

    return StreamingResponse(
        stream,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=recommendations.csv"}
    )


@app.get("/popular", response_model=RecommendResponse)
def popular_fallback(excluded: Optional[str] = Query(default="")):
    logger.info(f"Запрос /popular с excluded={excluded}")
    try:
        features = load_features_light()
        books_df = load_books_df()
        book_title_map = get_book_title_mapping()
        genres_map = get_genres_mapping()

        excluded_books = [int(bid) for bid in excluded.split(",") if bid.strip().isdigit()]
        logger.debug(f"Исключённые книги: {excluded_books}")

        merged = features.merge(
            books_df[["book_id", "title", "average_rating", "image_url"]],
            on="book_id",
            how="left"
        )

        top_books = merged[~merged["book_id"].isin(excluded_books)]
        top_books = top_books.sort_values("ratings_count", ascending=False).head(10)

        recommendations = []

        for _, row in top_books.iterrows():
            book_id = int(row["book_id"])
            genre_dict = genres_map.get(book_id, {})
            genres_str = ", ".join(genre_dict.keys()) if genre_dict else "—"

            rating = row.get("average_rating")
            rating = round(rating, 2) if pd.notnull(rating) else "—"

            recommendations.append(Recommendation(
                book_id=book_id,
                title=book_title_map.get(book_id, "Unknown"),
                score=0.0,
                genres=genres_str,
                image_url=row.get("image_url"),
                rating=rating,
                metadata=format_book_metadata(book_id, is_personal=False)
            ))

        logger.info(f"Отправлены {len(recommendations)} популярных книг (без {len(excluded_books)} исключённых)")
        return RecommendResponse(recommendations=recommendations, excluded_count=len(excluded_books))

    except Exception as e:
        logger.exception("Ошибка при генерации популярных книг")
        raise HTTPException(status_code=500, detail="Ошибка при генерации популярных книг")
