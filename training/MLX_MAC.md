# 🖥️ Обучение AkylAi на Mac (Apple Silicon, MLX)

Обучаем **свою модель прямо на твоём Mac** — без облака, без лимитов, бесплатно.
Подходит для Mac с чипом **M1/M2/M3/M4** (у тебя M1 Pro — отлично).

Всё делается в приложении **Терминал** (Cmd+Пробел → «Терминал»).

---

## Шаг 1. Установить инструмент MLX
В Терминале выполни:
```
pip3 install -U mlx-lm
```
*(если напишет, что `pip3` не найден — установи Python с сайта python.org и повтори)*

Проверь, что установилось:
```
python3 -c "import mlx_lm; print('OK', mlx_lm.__version__)"
```
Должно вывести `OK` и версию.

> ⚠️ Важно: все команды ниже запускай через **`python3 -m mlx_lm.<команда>`**.
> Короткие команды вроде `mlx_lm.lora` могут не находиться (`command not found`).

## Шаг 2. Скачать проект
```
git clone https://github.com/5005os/Cloud-Code.git
cd Cloud-Code
```

## Шаг 3. Подготовить данные
```
python3 training/prepare_mlx.py
```
Создаст `training/mlx_data/train.jsonl` и `valid.jsonl` (~1000 примеров).

## Шаг 4. Обучить модель (LoRA) 🔥
```
python3 -m mlx_lm.lora \
  --model mlx-community/Qwen2.5-3B-Instruct-4bit \
  --train \
  --data training/mlx_data \
  --iters 500 \
  --batch-size 1 \
  --num-layers 8 \
  --adapter-path training/adapters
```
- Первый раз скачается базовая модель (~2 ГБ).
- Обучение на M1 Pro — примерно **30–60 минут**. Будут бежать строчки с `Loss` (чем меньше — тем лучше).
- 💡 Если Mac будет тормозить или не хватит памяти — замени модель на маленькую:
  `mlx-community/Qwen2.5-1.5B-Instruct-4bit`

## Шаг 5. Проверить свою модель 💬
```
python3 -m mlx_lm.generate \
  --model mlx-community/Qwen2.5-3B-Instruct-4bit \
  --adapter-path training/adapters \
  --prompt "Что предусматривает статья 122 УК КР?"
```
Модель ответит по твоим данным. Можешь менять текст после `--prompt`.

## Шаг 6. Собрать готовую модель (объединить)
```
python3 -m mlx_lm.fuse \
  --model mlx-community/Qwen2.5-3B-Instruct-4bit \
  --adapter-path training/adapters \
  --save-path training/akylai-mlx
```
Теперь в папке `training/akylai-mlx` — **твоя готовая модель AkylAi**.

## Шаг 7. Запустить как сервер (для сайта)
```
python3 -m mlx_lm.server --model training/akylai-mlx --port 8080
```
Модель заработает по адресу `http://localhost:8080/v1/chat/completions`
(OpenAI-совместимый API). Дальше её можно подключить к сайту — скажи Claude,
и он добавит этот адрес в опцию «🖥️ Мой Mac».

---

## Частые вопросы
- **Не хватает памяти / медленно** → используй модель `Qwen2.5-1.5B-Instruct-4bit`
  и уменьши `--iters` до 300.
- **Хочешь умнее** → пополняй `dataset/`, снова запусти Шаг 3 и обучение.
- **`command not found: mlx_lm.lora`** → запускай через `python3 -m mlx_lm.lora ...`
  (так во всех шагах). И проверь установку: `python3 -c "import mlx_lm"`.

Сделано для Кыргызстана 🇰🇬
