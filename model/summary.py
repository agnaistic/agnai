from args import args
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
from device import device, torch_dtype

enabled = False

if args.all or args.summary:
    model = "Qiliang/bart-large-cnn-samsum-ChatGPT_v3"

    print("Preparing summarizer...")
    transformer = AutoModelForSeq2SeqLM.from_pretrained(
        model, torch_dtype=torch_dtype
    ).to(device)
    tokenizer = AutoTokenizer.from_pretrained(model)
    print("Summarizer ready")
    enabled = True
else:
    print("Summarizer skipped")


def summarize(text: str) -> str:
    if enabled is False:
        return None

    inputs = tokenizer(text, return_tensors="pt").to(device)

    summary_ids = transformer.generate(
        inputs["input_ids"],
        num_beams=2,
        temperature=float(0.5),
    )
    summary = tokenizer.batch_decode(
        summary_ids, skip_special_tokens=True, clean_up_tokenization_spaces=True
    )[0]
    return summary
