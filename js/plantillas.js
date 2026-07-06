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
    const margen = 14;

    const ahora = new Date();
    const fechaTexto = ahora.toLocaleDateString();
    const horaTexto = ahora.toLocaleTimeString();

    // ------------------------------------------------------------
    // Encabezado
    // ------------------------------------------------------------

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    pdf.setTextColor(20, 20, 20);
    pdf.text("PLANILLA DE TRABAJO — SEROLOGÍA", anchoPagina / 2, 16, { align: "center" });

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9.5);
    pdf.setTextColor(90, 90, 90);
    pdf.text(`Generado el ${fechaTexto} a las ${horaTexto}  ·  ${pacientes.length} paciente${pacientes.length === 1 ? "" : "s"}`, anchoPagina / 2, 22, { align: "center" });

    pdf.setDrawColor(180, 180, 180);
    pdf.setLineWidth(0.3);
    pdf.line(margen, 27, anchoPagina - margen, 27);

    // ------------------------------------------------------------
    // Tabla de pacientes
    //
    // Los anchos de columna se dejan que los calcule autoTable en
    // base al contenido (más robusto que fijarlos a mano), salvo un
    // ancho mínimo para Apellido/Nombre para que no queden angostas
    // si hay nombres cortos en la página.
    // ------------------------------------------------------------

    const filas = pacientes.map(function (p, index) {
        return [
            String(index + 1),
            p.dni,
            p.apellido,
            p.nombre,
            p.analisis["VDRL"] ? "" : "—",
            p.analisis["HIV"] ? "" : "—",
            p.analisis["HEPATITIS B"] ? "" : "—",
            p.analisis["TOXOPLASMOSIS"] ? "" : "—",
            p.analisis["CHAGAS"] ? "" : "—",
            p.analisis["PCR"] ? "" : "—"
        ];
    });

    pdf.autoTable({

        startY: 33,
        margin: { left: margen, right: margen },
        tableWidth: "auto",

        head: [[
            "N°", "DNI", "APELLIDO", "NOMBRE",
            "VDRL", "HIV", "HEP. B", "TOXO", "CHAGAS", "PCR"
        ]],

        body: filas,
        theme: "grid",

        headStyles: {
            fillColor: [30, 41, 45],
            textColor: 255,
            fontStyle: "bold",
            fontSize: 9.5,
            halign: "center",
            valign: "middle",
            cellPadding: 3.2
        },

        bodyStyles: {
            fontSize: 10,
            textColor: [25, 25, 25],
            halign: "center",
            valign: "middle",
            cellPadding: 3.5,
            lineColor: [215, 215, 215],
            lineWidth: 0.2,
            minCellHeight: 9
        },

        columnStyles: {
            0: { halign: "center", cellWidth: 10, fontStyle: "normal", textColor: [140, 140, 140] },
            1: { halign: "center", minCellWidth: 24, fontStyle: "bold" },
            2: { halign: "left", minCellWidth: 34, fontStyle: "bold" },
            3: { halign: "left", minCellWidth: 34, fontStyle: "bold" }
        },

        // las celdas "en blanco" (a completar a mano) se resaltan apenas,
        // para que salten a la vista dónde hay que escribir el resultado
        didParseCell: function (data) {
            if (data.section === "body" && data.column.index >= 4 && data.cell.raw === "") {
                data.cell.styles.fillColor = [246, 250, 249];
            }
        }

    });

    // ------------------------------------------------------------
    // Referencia
    // ------------------------------------------------------------

    const finTabla = pdf.lastAutoTable.finalY;

    pdf.setFont("helvetica", "italic");
    pdf.setFontSize(8.5);
    pdf.setTextColor(110, 110, 110);
    pdf.text(
        "Celda en blanco = análisis a realizar (completar resultado a mano)   ·   — = análisis no solicitado",
        margen,
        finTabla + 6
    );

    // ------------------------------------------------------------
    // Firma / validación (pie de página)
    // ------------------------------------------------------------

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

    // ------------------------------------------------------------
    // Guardar
    // ------------------------------------------------------------

    const año = ahora.getFullYear();
    const mes = String(ahora.getMonth() + 1).padStart(2, "0");
    const dia = String(ahora.getDate()).padStart(2, "0");
    const hora = String(ahora.getHours()).padStart(2, "0");
    const minutos = String(ahora.getMinutes()).padStart(2, "0");

    const nombrePDF = `PlanillaTrabajoSerologia_${año}-${mes}-${dia}_${hora}-${minutos}.pdf`;
    pdf.save(nombrePDF);

}
