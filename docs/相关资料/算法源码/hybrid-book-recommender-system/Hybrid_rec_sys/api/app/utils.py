import pandas as pd

from rapidfuzz import fuzz, process
from app.artifacts_loader import load_books_df, load_genres


def clean_text(text: str) -> str:
    return str(text).strip().lower()


def get_book_title_mapping() -> dict:
    books_df = load_books_df()
    return dict(zip(books_df["book_id"], books_df["title"]))


def get_all_book_titles() -> list[str]:
    books_df = load_books_df()
    clean_titles = books_df['title'].fillna('').map(clean_text)
    clean_orig = books_df['original_title'].fillna('').map(clean_text)
    return list(set(clean_titles).union(set(clean_orig)))


def match_books(user_input: str, book_titles: list[str], limit: int = 5, score_cutoff: int = 85) -> list[str]:
    cleaned_input = clean_text(user_input)
    matches = process.extract(cleaned_input, book_titles, scorer=fuzz.token_sort_ratio, limit=limit)
    return [title for title, score, _ in matches if score >= score_cutoff]


def get_all_genres() -> list[str]:
    genres_data = load_genres()
    all_genres = sorted({genre for genre_dict in genres_data for genre in genre_dict.keys()})
    return all_genres


def get_genres_mapping() -> dict:
    genres_data = load_genres()
    return {int(entry["book_id"]): entry["genres"] for entry in genres_data if "book_id" in entry}

def format_book_metadata(book_id: int, is_personal: bool = False) -> str:
    books_df = load_books_df()
    genres_map = get_genres_mapping()

    book_row = books_df[books_df["book_id"] == book_id]
    if book_row.empty:
        return "📚 Информация о книге недоступна"

    row = book_row.iloc[0]

    title = row.get("title", "—")
    authors = row.get("authors", "—")

    lang = row.get("language_code")
    lang = lang if pd.notna(lang) else "—"

    year = row.get("original_publication_year")
    year = int(year) if pd.notna(year) and year <= 2025 else "—"

    rating = row.get("average_rating")
    rating = round(rating, 2) if pd.notna(rating) else "—"

    genres_dict = genres_map.get(book_id, {})
    genres_str = ", ".join(genres_dict.keys()) if genres_dict else "—"

    lines = [
        f"✍️ **Автор(ы):** {authors}",
        f"🌐 **Язык:** {lang}",
        f"📅 **Год публикации:** {year}",
        f"⭐ **Рейтинг:** {rating}",
        f"🎨 **Жанры:** {genres_str}"
    ]

    return "\n".join(lines)
