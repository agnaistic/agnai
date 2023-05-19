from transformers import pipeline

summ = pipeline("summarization", model="philschmid/bart-large-cnn-samsum")


def summarize(text: str) -> str:
    summary = summ(text)
    return summary
