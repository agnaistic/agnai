from transformers import pipeline

summ = pipeline("summarization", model="philschmid/bart-large-cnn-samsum")


def summarize(text):
    summary = summ(text)
    return summary
