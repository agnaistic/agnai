import torch

device_string = "cuda:0" if torch.cuda.is_available() else "cpu"
device = torch.device(device_string)
torch_dtype = torch.float32 if device_string == "cpu" else torch.float16
