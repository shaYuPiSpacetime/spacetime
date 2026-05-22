from app.models import RecommendRequest, RecommendResponse, Recommendation
from app.artifacts_loader import (
    load_catboost_model, load_books_df, load_features_light, load_expected_order,
    load_sbert_descr, load_item_factors, load_item_mapper, load_kmeans_model
)
from app.utils import (
    clean_text, match_books, get_all_book_titles, get_book_title_mapping,
    get_genres_mapping, format_book_metadata
)
from app.logger import logger

import numpy as np
import pandas as pd
from sklearn.metrics.pairwise import cosine_similarity

def generate_recommendations(request: RecommendRequest) -> RecommendResponse:
    try:
        logger.info("Начало генерации рекомендаций")

        # === Загрузка данных и моделей ===
        books_df = load_books_df()
        features_light = load_features_light()
        model = load_catboost_model()
        expected_order = load_expected_order()
        sbert_descr = load_sbert_descr()
        item_factors = load_item_factors()
        item_mapper = load_item_mapper()
        kmeans_model = load_kmeans_model()
        logger.info("Загружены все модели и артефакты")

        # === Предобработка ===
        books_df['clean_title'] = books_df['title'].fillna('').map(clean_text)
        books_df['clean_original_title'] = books_df['original_title'].fillna('').map(clean_text)
        book_title_map = dict(zip(books_df['book_id'], books_df['title']))
        all_titles = list(set(books_df["clean_title"]).union(set(books_df["clean_original_title"])))
        genres_map = get_genres_mapping()

        matched_ids = []
        matched_titles = []

        # === Сопоставление книг ===
        for line in request.liked_books:
            matches = match_books(line, all_titles)
            if matches:
                best_match = matches[0]
                book_row = books_df[
                    (books_df["clean_title"] == best_match) |
                    (books_df["clean_original_title"] == best_match)
                ]
                if not book_row.empty:
                    book_id = book_row.iloc[0]["book_id"]
                    matched_ids.append(int(book_id))
                    matched_titles.append(best_match)

        if not matched_ids:
            logger.warning("Не удалось сопоставить ни одной книги")
            return RecommendResponse(
                recommendations=[],
                excluded_count=len(request.excluded_books or []),
                matched_titles=[]
            )

        logger.info(f"Сопоставлены книги: {matched_titles}")

        # === Векторы пользователя ===
        sbert_indices = [i for i, bid in enumerate(books_df["book_id"]) if bid in matched_ids]
        als_vectors = [item_factors[item_mapper[bid]] for bid in matched_ids if bid in item_mapper]

        if not sbert_indices or not als_vectors:
            logger.warning("Недостаточно эмбеддингов для расчёта рекомендаций")
            return RecommendResponse(
                recommendations=[],
                excluded_count=len(request.excluded_books or []),
                matched_titles=matched_titles
            )

        sbert_vec = np.mean(sbert_descr[sbert_indices], axis=0)
        als_vec = np.mean(als_vectors, axis=0)

        # === Отбор кандидатов ===
        valid_ids = (
            set(books_df["book_id"]) & set(item_mapper.keys()) & set(features_light["book_id"])
        )
        candidates = features_light[features_light["book_id"].isin(valid_ids)].copy()
        candidates = candidates[~candidates["book_id"].isin(matched_ids)]

        # === Косинусное сходство ===
        als_matrix = np.array([item_factors[item_mapper[bid]] for bid in candidates["book_id"]])
        sbert_matrix = np.array([
            sbert_descr[i] for i, bid in enumerate(books_df["book_id"])
            if bid in candidates["book_id"].values
        ])

        als_sim = cosine_similarity(als_vec.reshape(1, -1), als_matrix)[0]
        sbert_sim = cosine_similarity(sbert_vec.reshape(1, -1), sbert_matrix)[0]

        candidates["als_score"] = als_sim
        candidates["qdrant_score"] = sbert_sim
        candidates["rank_als"] = candidates["als_score"].rank(ascending=False).astype(int)
        candidates["rank_qdrant"] = candidates["qdrant_score"].rank(ascending=False).astype(int)

        # === Признаки пользователя ===
        for genre in genres_map.get(matched_ids[0], []):
            candidates[genre] = 1
        candidates["user_to_read_count"] = request.books_to_read
        candidates["cluster"] = kmeans_model.predict(als_vec.reshape(1, -1))[0]
        candidates["source"] = 0
        candidates["user_id"] = 999999

        # === Предсказание CatBoost ===
        candidates = candidates[expected_order]
        candidates["score"] = model.predict_proba(candidates)[:, 1]

        # === Добавим image_url, rating и title ===
        candidates = candidates.merge(
            books_df[["book_id", "image_url", "average_rating"]],
            on="book_id", how="left"
        )
        candidates["title"] = candidates["book_id"].map(book_title_map)

        # === Исключим скрытые книги ===
        excluded_books = set(request.excluded_books or [])
        candidates = candidates[~candidates["book_id"].isin(excluded_books)]

        top_n = candidates.sort_values("score", ascending=False).head(request.top_k)

        # === Сбор результатов ===
        recommendations = []
        for _, row in top_n.iterrows():
            book_id = int(row["book_id"])
            genre_dict = genres_map.get(book_id, {})
            genres_str = ", ".join(genre_dict.keys()) if genre_dict else "—"

            rating_val = row.get("average_rating")
            rating = round(rating_val, 2) if pd.notnull(rating_val) else None

            recommendations.append(Recommendation(
                book_id=book_id,
                title=row.get("title", "Unknown"),
                score=float(row["score"]),
                genres=genres_str,
                image_url=row.get("image_url"),
                rating=rating,
                metadata=format_book_metadata(book_id, is_personal=True)
            ))

        logger.info(f"Выдано {len(recommendations)} рекомендаций")
        return RecommendResponse(
            recommendations=recommendations,
            excluded_count=len(excluded_books),
            matched_titles=matched_titles
        )

    except Exception as e:
        logger.exception("Ошибка в generate_recommendations")
        return RecommendResponse(
            recommendations=[],
            excluded_count=0,
            matched_titles=[]
        )
