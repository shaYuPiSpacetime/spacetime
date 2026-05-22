import pandas as pd
import json
from pathlib import Path

# Пути к файлам
root = Path("D:/ML/LS/Rec_sys_project/Hybrid_rec_sys/")
books_path = root / "raw" / "books.csv"
genres_path = Path("D:/ML/LS/Rec_sys_project/Content_based/raw/goodreads_book_genres_initial.json")

print("\n📚 === Проверка books.csv ===")
books_df = pd.read_csv(books_path)
print(f"🔢 Кол-во записей: {len(books_df)}")

# Нужные признаки
required_columns = [
    "book_id", "title", "authors", "language_code",
    "original_publication_year", "average_rating", "image_url"
]

print("\n📌 Проверка наличия нужных колонок:")
for col in required_columns:
    if col in books_df.columns:
        print(f"✅ {col} — присутствует")
    else:
        print(f"❌ {col} — отсутствует!")

# Проверка типов и пропусков
print("\n🧪 Типы и пропуски:")
print(books_df[required_columns].dtypes)
print(books_df[required_columns].isna().sum())

# Статистика по признакам
print("\n📈 average_rating:")
print(books_df["average_rating"].describe())

print("\n🗓️ original_publication_year (последние 10 лет):")
print(books_df["original_publication_year"].dropna().astype(int).value_counts().sort_index().tail(10))

print("\n✍️ Топ-5 авторов:")
print(books_df["authors"].value_counts().head())

print("\n🌐 Топ-5 языков:")
print(books_df["language_code"].value_counts().head())

print("\n🖼️ Пример image_url:")
print(books_df["image_url"].dropna().head(1).values)

# Границы допустимых значений
print("\n✅ Проверка значений:")
invalid_rating = books_df[(books_df["average_rating"] < 0) | (books_df["average_rating"] > 5)]
invalid_year = books_df[(books_df["original_publication_year"] < 1800) | (books_df["original_publication_year"] > 2025)]

print(f"🔸 Некорректный рейтинг (0–5): {len(invalid_rating)}")
print(f"🔸 Некорректный год (1800–2025): {len(invalid_year)}")

# Проверка genres.json
print("\n🎨 === Проверка genres.json ===")
with open(genres_path, "r", encoding="utf-8") as f:
    genres_data = [json.loads(line) for line in f]

print(f"📏 Кол-во жанровых записей: {len(genres_data)}")
genre_book_ids = {int(entry["book_id"]) for entry in genres_data if "book_id" in entry}
book_ids = set(books_df["book_id"])

missing_genres = book_ids - genre_book_ids
print(f"⚠️ Книг без жанров: {len(missing_genres)}")

# Среднее число жанров
genre_counts = [len(entry["genres"]) for entry in genres_data if "genres" in entry]
avg_genres = sum(genre_counts) / len(genre_counts)
print(f"📊 Среднее кол-во жанров на книгу (в genres.json): {round(avg_genres, 2)}")

# Пример итоговой записи
print("\n🔍 Пример записи:")
print(books_df[required_columns].head(1).T)

print("\n✅ Проверка завершена.")
