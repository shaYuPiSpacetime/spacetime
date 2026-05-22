from functools import lru_cache
import pandas as pd
import numpy as np
import joblib
from catboost import CatBoostClassifier
from pathlib import Path
import json


root_path = Path("D:/ML/LS/Rec_sys_project/Hybrid_rec_sys/")
data_path = root_path / "data"
vectorized_dir = root_path / "vectorized"
sbert_dir = vectorized_dir / "sbert"
als_path = root_path / "als"

# Пути к файлам
model_path = root_path / "catboost_final.cbm"
books_path = root_path / "raw" / "books.csv"
genres_path = Path("D:/ML/LS/Rec_sys_project/Content_based/raw/goodreads_book_genres_initial.json")
descr_tfidf_path = vectorized_dir / "tfidf_vectorizer_descr.pkl"
sbert_descr_path = sbert_dir / "X_full_description_sbert.npy"
sbert_genre_path = sbert_dir / "X_full_genre_text_sbert.npy"
expected_order_path = root_path / "X_train.csv"


@lru_cache()
def load_catboost_model():
    model = CatBoostClassifier()
    model.load_model(model_path)
    return model


@lru_cache()
def load_books_df():
    return pd.read_csv(books_path)


@lru_cache()
def load_features_light():
    return pd.read_csv(data_path / "features_full_light.csv")


@lru_cache()
def load_genres():
    with open(genres_path, "r", encoding="utf-8") as f:
        return [json.loads(line) for line in f]


@lru_cache()
def load_expected_order():
    return pd.read_csv(expected_order_path, nrows=1).columns.tolist()


@lru_cache()
def load_descr_vectorizer():
    with open(descr_tfidf_path, "rb") as f:
        return joblib.load(f)


@lru_cache()
def load_sbert_descr():
    return np.load(sbert_descr_path, mmap_mode="r")


@lru_cache()
def load_sbert_genre():
    return np.load(sbert_genre_path, mmap_mode="r")


@lru_cache()
def load_item_factors():
    return np.load(als_path / "item_factors.npy")


@lru_cache()
def load_item_mapper():
    with open(als_path / "item_mapper.pkl", "rb") as f:
        return joblib.load(f)


@lru_cache()
def load_kmeans_model():
    with open(als_path / "kmeans_model.pkl", "rb") as f:
        return joblib.load(f)
