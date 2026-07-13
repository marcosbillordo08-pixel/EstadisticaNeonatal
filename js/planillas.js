const btnDescargarPlanillaPacientes = document.getElementById("btnDescargarPlanillaPacientes");

if (btnDescargarPlanillaPacientes) {
    btnDescargarPlanillaPacientes.addEventListener("click", generarPlanillaPacientesPDF);
}

function formatearFechaNacimientoPlanilla(fechaISO) {
    if (!fechaISO) return "";
    const partes = String(fechaISO).split("-");
    if (partes.length !== 3) return fechaISO;
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function textoTipoPacientePlanilla(tipoPaciente) {
    return tipoPaciente === "RN" ? "R/N" : "Embarazada";
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

    const ahora = new Date();
    const fechaTexto = ahora.toLocaleDateString();
    const horaTexto = ahora.toLocaleTimeString();

    // ------------------------------------------------------------
    // Encabezado
    // ------------------------------------------------------------
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(15);
    pdf.setTextColor(20, 20, 20);
    pdf.text("PLANILLA DE TRABAJO — SEROLOGÍA", anchoPagina / 2, 14, { align: "center" });

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(90, 90, 90);
    pdf.text(
        `Generado el ${fechaTexto} a las ${horaTexto}  ·  ${pacientes.length} paciente${pacientes.length === 1 ? "" : "s"}`,
        anchoPagina / 2,
        20,
        { align: "center" }
    );

    pdf.setDrawColor(180, 180, 180);
    pdf.setLineWidth(0.3);
    pdf.line(margen, 24, anchoPagina - margen, 24);

    // ------------------------------------------------------------
    // Filas
    // ------------------------------------------------------------
    const filas = pacientes.map(function (p, index) {
        const analisis = p.analisis || {};

        return [
            String(index + 1),
            textoTipoPacientePlanilla(p.tipoPaciente),
            p.sector || "",
            p.dni || "",
            p.apellido || "",
            p.nombre || "",
            p.semanasGestacion || "",
            formatearFechaNacimientoPlanilla(p.fechaNacimiento || ""),
            analisis["VDRL"] ? "" : "—",
            analisis["TPPA ELISA"] ? "" : "—",
            analisis["HIV ELISA"] ? "" : "—",
            analisis["TOXO HAI"] ? "" : "—",
            analisis["CHAGAS HAI"] ? "" : "—",
            analisis["CHAGAS ELISA"] ? "" : "—",
            analisis["HEP B ELISA"] ? "" : "—"
        ];
    });

    pdf.autoTable({
        startY: 29,
        margin: { left: margen, right: margen },
        tableWidth: "auto",

        head: [[
            "N°",
            "TIPO",
            "SECTOR",
            "DNI / ID",
            "APELLIDO",
            "NOMBRE",
            "SEM.",
            "F. NAC.",
            "VDRL",
            "TPPA",
            "HIV",
            "TOXO HAI",
            "CHAGAS HAI",
            "CHAGAS ELISA",
            "HEP. B"
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
            fontSize: 8.4,
            textColor: [25, 25, 25],
            halign: "center",
            valign: "middle",
            cellPadding: 2.7,
            lineColor: [215, 215, 215],
            lineWidth: 0.2,
            minCellHeight: 8
        },

        columnStyles: {
            0: { halign: "center", cellWidth: 9, fontStyle: "normal", textColor: [140, 140, 140] },
            1: { halign: "center", cellWidth: 18, fontStyle: "bold" },
            2: { halign: "center", cellWidth: 24, fontStyle: "bold" },
            3: { halign: "center", cellWidth: 28, fontStyle: "bold" },
            4: { halign: "left", cellWidth: 28, fontStyle: "bold" },
            5: { halign: "left", cellWidth: 22 },
            6: { halign: "center", cellWidth: 12 },
            7: { halign: "center", cellWidth: 20 }
        },

        didParseCell: function (data) {
            // Resalta levemente las celdas en blanco de análisis para completar a mano
            if (data.section === "body" && data.column.index >= 8 && data.cell.raw === "") {
                data.cell.styles.fillColor = [246, 250, 249];
            }
        }
    });

    // ------------------------------------------------------------
    // Referencia
    // ------------------------------------------------------------
    const finTabla = pdf.lastAutoTable.finalY;

    pdf.setFont("helvetica", "italic");
    pdf.setFontSize(8.2);
    pdf.setTextColor(110, 110, 110);
    pdf.text(
        "Celda en blanco = análisis a realizar (completar resultado a mano)   ·   — = análisis no solicitado",
        margen,
        finTabla + 6
    );

    // ------------------------------------------------------------
    // Firma / validación
    // ------------------------------------------------------------
    const yFirma = altoPagina - 20;

    pdf.setDrawColor(160, 160, 160);
    pdf.line(margen, yFirma, margen + 60, yFirma);
    pdf.line(anchoPagina - margen - 60, yFirma, anchoPagina - margen, yFirma);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.5);
    pdf.setTextColor(90, 90, 90);

    pdf.text("Firma / validación", margen + 15, yFirma + 5);
    pdf.text("Responsable del sector", anchoPagina - margen - 42, yFirma + 5);

    // ------------------------------------------------------------
    // Guardar
    // ------------------------------------------------------------
    const nombreArchivo = `planilla_serologia_${Date.now()}.pdf`;
    pdf.save(nombreArchivo);
}

