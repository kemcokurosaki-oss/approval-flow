import glob
import openpyxl

path = glob.glob("修正内容一覧_20260827-0828.xlsx")[0]
wb = openpyxl.load_workbook(path, data_only=False)
for ws in wb.worksheets:
    print("=== SHEET:", ws.title, ws.dimensions, "===")
    for row in ws.iter_rows():
        for cell in row:
            if cell.value is not None:
                print(cell.coordinate, repr(cell.value))
