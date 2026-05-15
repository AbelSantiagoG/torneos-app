import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

export async function exportActaPdf(element: HTMLElement, filename: string): Promise<void> {
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    logging: false,
    backgroundColor: '#ffffff',
  })

  const imgData = canvas.toDataURL('image/png')
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = pdf.internal.pageSize.getWidth()
  const pageH = pdf.internal.pageSize.getHeight()
  const margin = 8
  const contentW = pageW - margin * 2
  const imgH = (canvas.height * contentW) / canvas.width

  let heightLeft = imgH
  let position = margin

  pdf.addImage(imgData, 'PNG', margin, position, contentW, imgH)
  heightLeft -= pageH - margin * 2

  while (heightLeft > 0) {
    position = margin - (imgH - heightLeft)
    pdf.addPage()
    pdf.addImage(imgData, 'PNG', margin, position, contentW, imgH)
    heightLeft -= pageH - margin * 2
  }

  pdf.save(filename)
}
