const botonPDF = document.getElementById("btnExportarPDF");
const NOMBRES_MESES_PDF = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
];

if (botonPDF) {
    botonPDF.addEventListener("click", generarPDF);
}

function formatearFechaNacimientoPDF(fechaISO) {
    if (!fechaISO) return "—";
    const partes = String(fechaISO).split("-");
    if (partes.length !== 3) return fechaISO;
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function obtenerTextoTipoPacientePDF(tipoPaciente) {
    return tipoPaciente === "RN" ? "R/N" : "Embarazada";
}

function obtenerTextoResultadoPDF(entrada) {
    if (!entrada) return "—";

    const grupo = GRUPOS_RESULTADO[entrada.reactivo];
    const opciones = OPCIONES_RESULTADO[grupo] || [];
    const opcion = opciones.find(function (o) {
        return o.valor === entrada.resultado;
    });

    const etiquetaResultado = opcion ? opcion.etiqueta : (entrada.resultado || "");

    if (entrada.titulo && String(entrada.titulo).trim() !== "") {
        return `${etiquetaResultado} ${entrada.titulo}`;
    }

    return etiquetaResultado || "—";
}

function generarFilasHistorialAgrupadoPDF() {
    if (!Array.isArray(entradas) || entradas.length === 0) return [];

    const mapa = {};

    entradas.forEach(function (e) {
        const fecha = e.fecha || "";
        const dni = String(e.dni || "").trim();
        const tipoPaciente = e.tipoPaciente || "EMBARAZADA";
        const sector = String(e.sector || "").trim();
        const apellido = String(e.apellido || "").trim();
        const nombre = String(e.nombre || "").trim();
        const semanasGestacion = e.semanasGestacion || "";
        const fechaNacimiento = e.fechaNacimiento || "";

        const clave = [
            fecha,
            dni,
            tipoPaciente,
            sector,
            apellido,
            nombre,
            semanasGestacion,
            fechaNacimiento
        ].join("||");

        if (!mapa[clave]) {
            mapa[clave] = {
                fecha: fecha,
                dni: dni,
                tipoPaciente: tipoPaciente,
                sector: sector,
                apellido: apellido,
                nombre: nombre,
                semanasGestacion: semanasGestacion,
                fechaNacimiento: fechaNacimiento,
                reactivos: {
                    "VDRL": "—",
                    "TPPA ELISA": "—",
                    "HIV ELISA": "—",
                    "TOXO HAI": "—",
                    "CHAGAS HAI": "—",
                    "CHAGAS ELISA": "—",
                    "HEP B ELISA": "—"
                },
                _orden: parsearFecha(fecha).getTime() || 0,
                _id: e.id || 0
            };
        }

        mapa[clave].reactivos[e.reactivo] = obtenerTextoResultadoPDF(e);

        if ((e.id || 0) > mapa[clave]._id) {
            mapa[clave]._id = e.id || 0;
        }
    });

    const filasAgrupadas = Object.values(mapa)
        .sort(function (a, b) {
            return b._orden - a._orden || b._id - a._id;
        })
        .map(function (fila) {
            const fechaObj = parsearFecha(fila.fecha);
            const fechaTexto = `${formatearFechaCorta(fechaObj)}/${fechaObj.getFullYear()}`;

            return [
                fechaTexto,
                fila.dni || "—",
                obtenerTextoTipoPacientePDF(fila.tipoPaciente),
                fila.sector || "—",
                fila.apellido || "—",
                fila.nombre || "—",
                fila.semanasGestacion || "—",
                formatearFechaNacimientoPDF(fila.fechaNacimiento),
                fila.reactivos["VDRL"] || "—",
                fila.reactivos["TPPA ELISA"] || "—",
                fila.reactivos["HIV ELISA"] || "—",
                fila.reactivos["TOXO HAI"] || "—",
                fila.reactivos["CHAGAS HAI"] || "—",
                fila.reactivos["CHAGAS ELISA"] || "—",
                fila.reactivos["HEP B ELISA"] || "—"
            ];
        });

    return filasAgrupadas;
}

function generarPDF() {
    const botonOriginal = botonPDF ? botonPDF.innerHTML : "";

    try {
        if (!window.jspdf || typeof window.jspdf.jsPDF !== "function") {
            throw new Error("No se pudo cargar la librería jsPDF. Revisá tu conexión e intentá nuevamente.");
        }

        if (!Array.isArray(entradas)) {
            throw new Error("Todavía no se cargaron los datos de serología. Esperá un momento e intentá nuevamente.");
        }

        if (botonPDF) {
            botonPDF.disabled = true;
            botonPDF.textContent = "Generando PDF...";
        }

        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF("l", "mm", "a4");

        if (typeof pdf.autoTable !== "function") {
            throw new Error("No se pudo cargar el complemento de tablas del PDF. Revisá tu conexión e intentá nuevamente.");
        }

        const anchoPagina = pdf.internal.pageSize.getWidth();
        const altoPagina = pdf.internal.pageSize.getHeight();

        const ahora = new Date();
        const fechaTexto = ahora.toLocaleDateString();
        const horaTexto = ahora.toLocaleTimeString();

    // ------------------------------------------------------------
    // Encabezado
    // ------------------------------------------------------------
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18);
    pdf.text("ESTADÍSTICA DE SEROLOGÍA", anchoPagina / 2, 15, { align: "center" });

    pdf.setFontSize(12);
    pdf.setFont("helvetica", "normal");
    pdf.text(
        "VDRL · TPPA ELISA · HIV ELISA · TOXO HAI · CHAGAS HAI · CHAGAS ELISA · HEP B ELISA",
        anchoPagina / 2,
        22,
        { align: "center" }
    );

    pdf.setFontSize(10);
    pdf.text(`Generado el ${fechaTexto} a las ${horaTexto}`, anchoPagina / 2, 28, { align: "center" });

    pdf.line(15, 33, anchoPagina - 15, 33);

    // ------------------------------------------------------------
    // Resumen
    // ------------------------------------------------------------
    const hoy = new Date();
    const { lunes, domingo } = obtenerRangoSemana(hoy);

    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
    finMes.setHours(23, 59, 59, 999);

    const inicioAño = new Date(hoy.getFullYear(), 0, 1);
    const finAño = new Date(hoy.getFullYear(), 11, 31);
    finAño.setHours(23, 59, 59, 999);

    const totalSemana = totalEnRango(lunes, domingo);
    const totalMes = totalEnRango(inicioMes, finMes);
    const totalAño = totalEnRango(inicioAño, finAño);
    const totalHistorico = entradas.reduce(function (acc, e) {
        return acc + (e.cantidad || 1);
    }, 0);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.text("Resumen", 15, 41);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.text(`Esta semana (${formatearFechaCorta(lunes)} al ${formatearFechaCorta(domingo)}): ${totalSemana}`, 15, 48);
    pdf.text(`Este mes (${NOMBRES_MESES_PDF[hoy.getMonth()]} ${hoy.getFullYear()}): ${totalMes}`, 15, 54);
    pdf.text(`Este año (${hoy.getFullYear()}): ${totalAño}`, 15, 60);
    pdf.text(`Total histórico: ${totalHistorico} análisis (${entradas.length} carga${entradas.length === 1 ? "" : "s"})`, 15, 66);

    // ------------------------------------------------------------
    // Tabla: distribución por reactivo
    // ------------------------------------------------------------
    const totalesPorReactivo = {};
    REACTIVOS.forEach(function (r) {
        totalesPorReactivo[r] = 0;
    });

    entradas.forEach(function (e) {
        totalesPorReactivo[e.reactivo] += (e.cantidad || 1);
    });

    const filasDistribucion = REACTIVOS
        .slice()
        .sort(function (a, b) {
            return totalesPorReactivo[b] - totalesPorReactivo[a];
        })
        .map(function (r) {
            const cantidad = totalesPorReactivo[r];
            const porcentaje = totalHistorico > 0
                ? ((cantidad / totalHistorico) * 100).toFixed(1)
                : "0.0";

            return [
                ETIQUETAS_REACTIVO[r],
                String(cantidad),
                `${porcentaje}%`
            ];
        });

    pdf.autoTable({
        startY: 73,
        margin: { left: 15, right: 15 },
        tableWidth: (anchoPagina - 30) / 2 - 5,
        head: [["Reactivo", "Cantidad", "% del total"]],
        body: filasDistribucion,
        theme: "grid",
        headStyles: {
            fillColor: [46, 125, 50],
            textColor: 255,
            fontStyle: "bold",
            halign: "center"
        },
        styles: {
            fontSize: 9,
            cellPadding: 2.5,
            halign: "center",
            valign: "middle"
        }
    });

    const finTablaDistribucion = pdf.lastAutoTable.finalY;

    // ------------------------------------------------------------
    // Tabla: resultados
    // ------------------------------------------------------------
    const filasResultados = REACTIVOS.map(function (r) {
        const grupo = GRUPOS_RESULTADO[r];
        const opciones = OPCIONES_RESULTADO[grupo] || [];

        const totalesResultado = {};
        opciones.forEach(function (o) {
            totalesResultado[o.valor] = 0;
        });

        let total = 0;

        entradas.forEach(function (e) {
            if (e.reactivo !== r) return;
            totalesResultado[e.resultado] = (totalesResultado[e.resultado] || 0) + (e.cantidad || 1);
            total += (e.cantidad || 1);
        });

        const opA = opciones[0] || { valor: "", etiqueta: "-" };
        const opB = opciones[1] || { valor: "", etiqueta: "-" };

        const cantA = totalesResultado[opA.valor] || 0;
        const cantB = totalesResultado[opB.valor] || 0;
        const pctA = total > 0 ? ((cantA / total) * 100).toFixed(1) : "0.0";
        const pctB = total > 0 ? ((cantB / total) * 100).toFixed(1) : "0.0";

        return [
            ETIQUETAS_REACTIVO[r],
            `${opA.etiqueta}: ${cantA}`,
            `${pctA}%`,
            `${opB.etiqueta}: ${cantB}`,
            `${pctB}%`,
            String(total)
        ];
    });

    pdf.autoTable({
        startY: 73,
        margin: { left: anchoPagina / 2 + 5, right: 15 },
        tableWidth: (anchoPagina - 30) / 2 - 5,
        head: [["Reactivo", "Resultado A", "% A", "Resultado B", "% B", "Total"]],
        body: filasResultados,
        theme: "grid",
        headStyles: {
            fillColor: [33, 150, 243],
            textColor: 255,
            fontStyle: "bold",
            halign: "center"
        },
        styles: {
            fontSize: 8.6,
            cellPadding: 2.2,
            halign: "center",
            valign: "middle"
        }
    });

    const finTablaResultados = pdf.lastAutoTable.finalY;
    let ySiguiente = Math.max(finTablaDistribucion, finTablaResultados) + 10;

    // ------------------------------------------------------------
    // Historial agrupado por paciente + fecha
    // ------------------------------------------------------------
    const filasHistorial = generarFilasHistorialAgrupadoPDF();

    if (filasHistorial.length > 0) {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(11);
        pdf.text("Historial agrupado por paciente / fecha", 15, ySiguiente);

        pdf.autoTable({
            startY: ySiguiente + 4,
            margin: { left: 10, right: 10 },
            head: [[
                "Fecha",
                "DNI / ID",
                "Tipo",
                "Sector",
                "Apellido",
                "Nombre",
                "Sem.",
                "F. Nac.",
                "VDRL",
                "TPPA",
                "HIV",
                "TOXO HAI",
                "CHAGAS HAI",
                "CHAGAS ELISA",
                "HEP. B"
            ]],
            body: filasHistorial,
            theme: "grid",
            headStyles: {
                fillColor: [30, 41, 45],
                textColor: 255,
                fontStyle: "bold",
                fontSize: 7.5,
                halign: "center",
                valign: "middle"
            },
            styles: {
                fontSize: 7.2,
                cellPadding: 1.8,
                halign: "center",
                valign: "middle"
            },
            columnStyles: {
                0: { cellWidth: 16 },
                1: { cellWidth: 28, fontStyle: "bold" },
                2: { cellWidth: 16 },
                3: { cellWidth: 22 },
                4: { cellWidth: 22, halign: "left" },
                5: { cellWidth: 18, halign: "left" },
                6: { cellWidth: 10 },
                7: { cellWidth: 16 }
            },
            didDrawPage: function () {
                pdf.setFont("helvetica", "normal");
                pdf.setFontSize(8);
                pdf.text(
                    `Estadística de Serología · ${fechaTexto}`,
                    anchoPagina - 70,
                    altoPagina - 6
                );
            }
        });
    }

        // ------------------------------------------------------------
        // Guardar
        // ------------------------------------------------------------
        const nombreArchivo = `estadistica_serologia_${Date.now()}.pdf`;
        pdf.save(nombreArchivo);
    } catch (error) {
        console.error("Error al generar el PDF de serología:", error);
        alert(`No se pudo generar el PDF. ${error.message || "Intentá nuevamente."}`);
    } finally {
        if (botonPDF) {
            botonPDF.disabled = false;
            botonPDF.innerHTML = botonOriginal;
        }
    }
}
