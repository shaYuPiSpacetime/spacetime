import streamlit as st
import requests
import sys

from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parents[2]))
from api.app.logger import logger

# ========== Настройки внешнего вида ==========
st.set_page_config(
    page_title="Гибридная рекомендательная система по книгам",
    layout="wide",
    initial_sidebar_state="expanded"
)
st.image("logo.png", width=220)
st.markdown("<h1 style='color:#6c5ce7;'>📚 Гибридная рекомендательная система</h1>", unsafe_allow_html=True)
st.caption("Создано с заботой о читателях")

logger.info("Streamlit-интерфейс запущен")

# ========== Тема оформления ==========
st._config.set_option("theme.base", "light")
st._config.set_option("theme.primaryColor", "#d38f5e")
st._config.set_option("theme.backgroundColor", "#fffaf3")
st._config.set_option("theme.secondaryBackgroundColor", "#f3e9e0")
st._config.set_option("theme.textColor", "#40312b")
st._config.set_option("theme.font", "monospace")

st.markdown("""
    <style>
        .stApp { background-color: #fffaf3; background-image: url('https://www.transparenttextures.com/patterns/paper-fibers.png'); background-size: cover; }
        h1 { font-family: 'Georgia', serif; letter-spacing: 0.5px; }
    </style>
""", unsafe_allow_html=True)

st.markdown(
    """
    <div style="background-color:#f3e9e0;padding:10px 20px;border-radius:10px">
    <h4 style="color:#40312b">Книги, похожие на выбранные</h4>
    <p>На основе жанров и стиля — ищем то, что вам понравится</p>
    </div>
    """,
    unsafe_allow_html=True
)

with st.expander("ℹ️ О рекомендательной системе"):
    st.markdown("""
    Это гибридная рекомендательная система, объединяющая:

    🔹 Контентный анализ — описание и жанры книг обрабатываются с помощью:
    - TF-IDF и SBERT для текстов описаний (`description`) и жанров (`genre_text`)
    - TF-IDF по авторам и названиям
    - One-Hot Encoding по языку, + мета - признаки (рейтинг, год, количество оценок)

    🔹 Коллаборативная фильтрация — используются эмбеддинги из:
    - ALS (Implicit) — латентные факторы пользователей и книг
    - SBERT — для семантической близости книг

    🔹 Ансамбль и ранжирование:
    - Все признаки объединяются в единый датафрейм кандидатов 
    - Финальная модель — CatBoostClassifier
    - Классификатор обучен на взаимодействиях пользователей (рейтингах)

    📦 Датасет : [Goodbooks - 10k](https://github.com/zygmuntz/goodbooks-10k)
    - 10000 книг 
    - 53424 пользователя
    - 6000000+ оценок

    📌 Пользователь вводит любимые книги и жанры, а система:
    - Находит похожие по смыслу книги (через SBERT и ALS)
    - Обогащает их признаками
    - Ранжирует с помощью модели
    - Отображает топ-рекомендации
    """)

# === Функция запроса рекомендаций ===
def fetch_recommendations(payload):
    try:
        logger.info("Отправка запроса к API /recommend")
        resp = requests.post("http://localhost:8000/recommend", json=payload)
        if resp.status_code == 200:
            logger.info("Получен успешный ответ от /recommend")
            return resp.json()
        else:
            logger.warning(f"Ошибка API /recommend — статус {resp.status_code}")
            st.error("\u274c Ошибка сервера при получении рекомендаций")
            return None
    except Exception as e:
        logger.exception("Исключение при fetch_recommendations")
        st.error(f"\u274c Ошибка: {e}")
        return None

# === Интерфейс ввода ===
st.subheader("💼 Персонализированный режим")

user_input_titles = st.text_area("📚 Введите любимые книги (на английском языке по одной на строке):")

# === Получение жанров ===
try:
    genres_response = requests.get("http://localhost:8000/genres")
    genres_response.raise_for_status()
    all_genres = genres_response.json().get("genres", [])
    logger.info(f"Загружено {len(all_genres)} жанров из API")
except Exception as e:
    logger.exception("Ошибка при загрузке жанров")
    all_genres = []

selected_genres = st.multiselect("🎯 Выберите жанры:", all_genres)

if "excluded_books" not in st.session_state:
    st.session_state.excluded_books = set()

books_to_read = st.number_input("📘 Сколько книг хотите прочитать?", min_value=1, max_value=100, value=5)
top_k = st.slider("🔹 Сколько рекомендаций показать?", 5, 30, 10)

# === Получение рекомендаций ===
if st.button("📄 Получить рекомендации"):
    is_personal = bool(user_input_titles.strip())
    logger.info(f"Пользователь запросил рекомендации. Введено книг: {len(user_input_titles.strip().splitlines())}")

    with st.spinner("🔄 Компьютер думает..."):
        if not is_personal:
            st.warning("📂 Вы не ввели книги. Показываем популярные.")
            resp = requests.get("http://localhost:8000/popular")
            if resp.status_code == 200:
                st.session_state.recommendations = resp.json().get("recommendations", [])
                st.session_state.matched_titles = []
                st.session_state.is_personal = False
                st.toast("📚 Загружены популярные книги")
                logger.info("Показаны популярные книги (fallback)")
            else:
                logger.warning(f"Ошибка API /popular — статус {resp.status_code}")
                st.error("\u274c Ошибка сервера при получении популярных книг")
                st.stop()
        else:
            payload = {
                "liked_books": user_input_titles.strip().splitlines(),
                "liked_genres": selected_genres,
                "books_to_read": books_to_read,
                "top_k": top_k,
                "excluded_books": list(st.session_state.excluded_books)
            }
            st.session_state.last_payload = payload
            resp_json = fetch_recommendations(payload)
            if resp_json:
                st.session_state.recommendations = resp_json.get("recommendations", [])
                st.session_state.matched_titles = resp_json.get("matched_titles", [])
                st.session_state.is_personal = True
                st.toast("✅ Рекомендации обновлены")
                logger.info("Персонализированные рекомендации успешно получены")

# === Отображение рекомендаций ===
if "recommendations" in st.session_state:
    recs = st.session_state.recommendations
    matched_titles = st.session_state.get("matched_titles", [])
    is_personal = st.session_state.get("is_personal", False)

    if is_personal and matched_titles:
        st.markdown("🔍 Найденные книги:")
        st.markdown(", ".join(matched_titles))

    shown_recs = [r for r in recs if r["book_id"] not in st.session_state.excluded_books]

    st.success("📚 Рекомендации:" if is_personal else "🔥 Топ-10 популярных книг:")

    for r in shown_recs:
        with st.container():
            cols = st.columns([1, 4])
            with cols[0]:
                if r.get("image_url"):
                    st.image(r["image_url"], use_container_width=True)
            with cols[1]:
                st.markdown(f"**{r['title']}**")
                st.markdown(r.get("metadata", "—").replace("\n", "  \n"), unsafe_allow_html=True)

                if is_personal:
                    st.markdown(f"\U0001F4C8 Уверенность: **{r.get('score', 0):.0%}**")

                if st.button("\U0001F645 Скрыть эту книгу", key=f"exclude_{r['book_id']}"):
                    st.session_state.excluded_books.add(r["book_id"])
                    st.toast(f"🙅 Книга **{r['title']}** скрыта")
                    logger.info(f"Пользователь скрыл книгу: {r['title']} (book_id={r['book_id']})")

                    if is_personal:
                        st.session_state.last_payload["excluded_books"] = list(st.session_state.excluded_books)
                        updated = fetch_recommendations(st.session_state.last_payload)
                        if updated:
                            st.session_state.recommendations = updated["recommendations"]
                            st.session_state.matched_titles = updated.get("matched_titles", [])
                            st.rerun()
                    else:
                        excluded = ",".join(map(str, st.session_state.excluded_books))
                        resp = requests.get("http://localhost:8000/popular", params={"excluded": excluded})
                        if resp.status_code == 200:
                            st.session_state.recommendations = resp.json().get("recommendations", [])
                            st.rerun()
        st.markdown("---")

    st.caption(f"\U0001F4E6 Скрытых книг: {len(st.session_state.excluded_books)}")

    # === Скачивание CSV ===
    if is_personal and shown_recs:
        csv_resp = requests.post("http://localhost:8000/recommend_csv", json=st.session_state.last_payload)
        if csv_resp.status_code == 200:
            st.download_button(
                label="📅 Скачать рекомендации (CSV)",
                data=csv_resp.content,
                file_name="recsys_books.csv",
                mime="text/csv"
            )
