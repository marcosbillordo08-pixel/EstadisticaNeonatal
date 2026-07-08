const btnDescargarPlanillaPacientes = document.getElementById("btnDescargarPlanillaPacientes");

if (btnDescargarPlanillaPacientes) {
    btnDescargarPlanillaPacientes.addEventListener("click", generarPlanillaPacientesPDF);
}

function generarPlanillaPacientesPDF() {
    if (typeof window.obtenerPacientesPlanilla !== "function") {
        alert("No se pudo leer la planilla de pacientes.");
        return;
    }

    const pacientes = window.obtenerPacientesPlanilla();

    if (!pacientes || pacientes.length === 0) {
        alert("No hay pacientes cargados en la planilla.");
        return;
    }

    if (!window.jspdf || !window.jspdf.jsPDF) {
        alert("No se cargó jsPDF.");
        return;
    }

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF("l", "mm", "a4");

    const anchoPagina = pdf.internal.pageSize.getWidth();
    const altoPagina = pdf.internal.pageSize.getHeight();
    const margen = 10;

    const ahora = new Date();
    const fechaTexto = ahora.toLocaleDateString();
    const horaTexto = ahora.toLocaleTimeString();

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(15);
    pdf.setTextColor(20, 20, 20);
    pdf.text("PLANILLA DE TRABAJO — SEROLOGÍA", anchoPagina / 2, 15, { align: "center" });

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(90, 90, 90);
    pdf.text(`Generado el ${fechaTexto} a las ${horaTexto} · ${pacientes.length} paciente${pacientes.length === 1 ? "" : "s"}`, anchoPagina / 2, 21, { align: "center" });

    pdf.setDrawColor(180, 180, 180);
    pdf.setLineWidth(0.3);
    pdf.line(margen, 25, anchoPagina - margen, 25);

    const filas = pacientes.map(function (p, index) {
        return [
            String(index + 1),
            p.dni,
            p.apellido,
            p.nombre,
            p.analisis["VDRL"] ? "" : "—",
            p.analisis["TPPA ELISA"] ? "" : "—",
            p.analisis["HIV ELISA"] ? "" : "—",
            p.analisis["TOXOPLASMOSIS HAI"] ? "" : "—",
            p.analisis["CHAGAS HAI"] ? "" : "—",
            p.analisis["CHAGAS ELISA"] ? "" : "—",
            p.analisis["HEPATITIS B ELISA"] ? "" : "—"
        ];
    });

    pdf.autoTable({
        startY: 30,
        margin: { left: margen, right: margen },
        tableWidth: "auto",
        head: [[
            "N°", "DNI", "APELLIDO", "NOMBRE",
            "VDRL", "TPPA", "HIV", "TOXO HAI", "CHAGAS HAI", "CHAGAS ELISA", "HEP. B"
        ]],
        body: filas,
        theme: "grid",

        headStyles: {
            fillColor: [30, 41, 45],
            textColor: 255,
            fontStyle: "bold",
            fontSize: 8,
            halign: "center",
            valign: "middle",
            cellPadding: 2.5
        },

        bodyStyles: {
            fontSize: 8.6,
            textColor: [25, 25, 25],
            halign: "center",
            valign: "middle",
            cellPadding: 2.8,
            lineColor: [215, 215, 215],
            lineWidth: 0.2,
            minCellHeight: 8
        },

        columnStyles: {
            0: { halign: "center", cellWidth: 9, fontStyle: "normal", textColor: [140, 140, 140] },
            1: { halign: "center", cellWidth: 22, fontStyle: "bold" },
            2: { halign: "left", cellWidth: 28, fontStyle: "bold" },
            3: { halign: "left", cellWidth: 28, fontStyle: "bold" },
            4: { cellWidth: 16 },
            5: { cellWidth: 18 },
            6: { cellWidth: 16 },
            7: { cellWidth: 20 },
            8: { cellWidth: 24 },
            9: { cellWidth: 26 },
            10: { cellWidth: 20 }
        },

        didParseCell: function (data) {
            if (data.section === "body" && data.column.index >= 4 && data.cell.raw === "") {
                data.cell.styles.fillColor = [246, 250, 249];
            }
        }
    });

    const finTabla = pdf.lastAutoTable.finalY;

    pdf.setFont("helvetica", "italic");
    pdf.setFontSize(8.2);
    pdf.setTextColor(110, 110, 110);
    pdf.text(
        "Celda en blanco = análisis a realizar (completar resultado a mano) · — = análisis no solicitado",
        margen,
        finTabla + 6
    );

    const yFirma = altoPagina - 22;

    pdf.setDrawColor(140, 140, 140);
    pdf.setLineWidth(0.2);

    pdf.line(margen, yFirma, margen + 70, yFirma);
    pdf.line(anchoPagina - margen - 70, yFirma, anchoPagina - margen, yFirma);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.5);
    pdf.setTextColor(90, 90, 90);
    pdf.text("Bioquímico/a responsable", margen, yFirma + 5);
    pdf.text("Fecha de realización", anchoPagina - margen - 70, yFirma + 5);

    const año = ahora.getFullYear();
    const mes = String(ahora.getMonth() + 1).padStart(2, "0");
    const dia = String(ahora.getDate()).padStart(2, "0");
    const hora = String(ahora.getHours()).padStart(2, "0");
    const minutos = String(ahora.getMinutes()).padStart(2, "0");

    const nombrePDF = `PlanillaTrabajoSerologia_${año}-${mes}-${dia}_${hora}-${minutos}.pdf`;
    pdf.save(nombrePDF);
}
