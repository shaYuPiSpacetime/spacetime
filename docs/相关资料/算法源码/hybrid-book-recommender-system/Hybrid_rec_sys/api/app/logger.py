import logging
import sys
from pathlib import Path

# Папка логов
LOG_DIR = Path(__file__).resolve().parent.parent / "logs"
LOG_DIR.mkdir(parents=True, exist_ok=True)

# Базовая настройка логгера
logger = logging.getLogger("book_recommender")
logger.setLevel(logging.INFO)

formatter = logging.Formatter("[%(asctime)s] %(levelname)s: %(message)s")

# Лог в файл
file_handler = logging.FileHandler(LOG_DIR / "app.log", encoding="utf-8")
file_handler.setFormatter(formatter)

# Лог в консоль
console_handler = logging.StreamHandler(sys.stdout)
console_handler.setFormatter(formatter)

logger.addHandler(file_handler)
logger.addHandler(console_handler)
