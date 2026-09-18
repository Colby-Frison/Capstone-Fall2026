from pypdf import PdfReader, PdfWriter

reader = PdfReader("./ame_guide.pdf")
writer = PdfWriter()

# Add whichever pages you want (0-indexed, so page 5 = index 4)
for page_num in [390, 397, 402]:
    writer.add_page(reader.pages[page_num])

with open("./ame_subset.pdf", "wb") as f:
    writer.write(f)