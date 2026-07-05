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

    const margen = 12;
    const anchoUtil = anchoPagina - (margen * 2);

    // anchos REALES de cada columna
    const anchosColumnas = [28, 38, 38, 22, 20, 26, 22, 28, 21];
    const anchoTabla = anchosColumnas.reduce((acc, n) => acc + n, 0);

    // centrado manual de la tabla
    const margenTabla = (anchoPagina - anchoTabla) / 2;

    const ahora = new Date();
    const fechaTexto = ahora.toLocaleDateString();
    const horaTexto = ahora.toLocaleTimeString();

    // =========================
    // ENCABEZADO
    // =========================
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(24);
    pdf.setTextColor(20, 20, 20);
    pdf.text("PLANILLA DE TRABAJO - SEROLOGIA", anchoPagina / 2, 18, { align: "center" });

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(12);
    pdf.text(`Generado el ${fechaTexto} a las ${horaTexto}`, anchoPagina / 2, 28, { align: "center" });

    pdf.setDrawColor(40, 40, 40);
    pdf.setLineWidth(0.5);
    pdf.line(margen, 34, anchoPagina - margen, 34);

    // =========================
    // TITULO SECCION
    // =========================
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(15);
    pdf.text("PLANILLA DE PACIENTES", margen, 45);

    // =========================
    // FILAS
    // =========================
    const filas = pacientes.map(function (p) {
        return [
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

    // =====================================================
    // TABLA CENTRADA
    // La suma de estos anchos da EXACTAMENTE 273 mm
    // (que es el ancho útil de A4 horizontal con margen 12)
    // =====================================================
    pdf.autoTable({
        startY: 50,
        margin: { left: margenTabla, right: margenTabla },
        tableWidth: anchoTabla,
        head: [[
            "DNI",
            "APELLIDO",
            "NOMBRE",
            "VDRL",
            "HIV",
            "HEP. B",
            "TOXO",
            "CHAGAS",
            "PCR"
        ]],
        body: filas,
        theme: "grid",

        headStyles: {
            fillColor: [35, 40, 45],
            textColor: 255,
            fontStyle: "bold",
            fontSize: 12,
            halign: "center",
            valign: "middle",
            lineColor: [210, 210, 210],
            lineWidth: 0.2,
            minCellHeight: 12
        },

        bodyStyles: {
            fontSize: 12,
            fontStyle: "bold",   // ← datos del paciente en negrita
            textColor: [20, 20, 20],
            halign: "center",
            valign: "middle",
            minCellHeight: 14,
            lineColor: [225, 225, 225],
            lineWidth: 0.2
        },

        styles: {
            cellPadding: 3
        },

        columnStyles: {
          0: { cellWidth: anchosColumnas[0] }, // DNI
          1: { cellWidth: anchosColumnas[1] }, // APELLIDO
          2: { cellWidth: anchosColumnas[2] }, // NOMBRE
          3: { cellWidth: anchosColumnas[3] }, // VDRL
          4: { cellWidth: anchosColumnas[4] }, // HIV
          5: { cellWidth: anchosColumnas[5] }, // HEP. B
          6: { cellWidth: anchosColumnas[6] }, // TOXO
          7: { cellWidth: anchosColumnas[7] }, // CHAGAS
          8: { cellWidth: anchosColumnas[8] }  // PCR
        }
    });

    // =========================
    // LEYENDA
    // =========================
    const finalY = pdf.lastAutoTable.finalY || 50;
    const leyendaY = finalY + 12;

    pdf.setDrawColor(220, 220, 220);
    pdf.setFillColor(250, 250, 250);
    pdf.roundedRect(margen, leyendaY, anchoUtil, 14, 2, 2, "FD");

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10.5);
    pdf.setTextColor(35, 35, 35);
    pdf.text(
        "Celdas vacías: análisis a realizar  /  Raya (—): análisis no solicitado para ese paciente.",
        margen + 4,
        leyendaY + 9
    );

    // =========================
    // GUARDAR
    // =========================
    const año = ahora.getFullYear();
    const mes = String(ahora.getMonth() + 1).padStart(2, "0");
    const dia = String(ahora.getDate()).padStart(2, "0");
    const hora = String(ahora.getHours()).padStart(2, "0");
    const minutos = String(ahora.getMinutes()).padStart(2, "0");

    const nombrePDF = `PlanillaTrabajoSerologia_${año}-${mes}-${dia}_${hora}-${minutos}.pdf`;
    pdf.save(nombrePDF);
}
