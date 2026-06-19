import openpyxl
wb = openpyxl.load_workbook("/home/z/my-project/upload/IT Asset New (3).xlsx", data_only=True, read_only=True)
ws = wb["Biometric"]
for i, row in enumerate(ws.iter_rows(values_only=True)):
    non_empty = sum(1 for c in row if c is not None and str(c).strip())
    if non_empty > 0:
        print(i, [c for c in row if c is not None and str(c).strip()])
    if i > 10:
        break
