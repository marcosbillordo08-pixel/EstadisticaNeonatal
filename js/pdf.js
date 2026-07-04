const botonPDF = document.getElementById("btnExportarPDF");

botonPDF.addEventListener("click", generarPDF);

function generarPDF() {

    const { jsPDF } = window.jspdf;

    const pdf = new jsPDF("l", "mm", "a4");

    const anchoPagina = pdf.internal.pageSize.getWidth();

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
    pdf.text("VDRL · HIV · Hepatitis B · Toxoplasmosis · Chagas · PCR", anchoPagina / 2, 22, { align: "center" });

    pdf.setFontSize(10);
    pdf.text(`Generado el ${fechaTexto} a las ${horaTexto}`, anchoPagina / 2, 28, { align: "center" });

    pdf.line(15, 33, anchoPagina - 15, 33);

    // ------------------------------------------------------------
    // Resumen (mismos totales que las cards en pantalla)
    // ------------------------------------------------------------

    const hoy = new Date();
    const { lunes, domingo } = obtenerRangoSemana(hoy);
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
    const inicioAño = new Date(hoy.getFullYear(), 0, 1);
    const finAño = new Date(hoy.getFullYear(), 11, 31);

    const totalSemana = totalEnRango(lunes, domingo);
    const totalMes = totalEnRango(inicioMes, finMes);
    const totalAño = totalEnRango(inicioAño, finAño);
    const totalHistorico = entradas.reduce(function (acc, e) { return acc + e.cantidad; }, 0);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.text("Resumen", 15, 41);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.text(`Esta semana (${formatearFechaCorta(lunes)} al ${formatearFechaCorta(domingo)}): ${totalSemana}`, 15, 48);
    pdf.text(`Este mes (${NOMBRES_MES[hoy.getMonth()]} ${hoy.getFullYear()}): ${totalMes}`, 15, 54);
    pdf.text(`Este año (${hoy.getFullYear()}): ${totalAño}`, 15, 60);
    pdf.text(`Total histórico: ${totalHistorico} análisis (${entradas.length} carga${entradas.length === 1 ? "" : "s"})`, 15, 66);

    // ------------------------------------------------------------
    // Tabla: distribución por reactivo
    // ------------------------------------------------------------

    const totalesPorReactivo = {};
    REACTIVOS.forEach(function (r) { totalesPorReactivo[r] = 0; });
    entradas.forEach(function (e) { totalesPorReactivo[e.reactivo] += e.cantidad; });

    const filasDistribucion = REACTIVOS
        .slice()
        .sort(function (a, b) { return totalesPorReactivo[b] - totalesPorReactivo[a]; })
        .map(function (r) {
            const cantidad = totalesPorReactivo[r];
            const porcentaje = totalHistorico > 0 ? ((cantidad / totalHistorico) * 100).toFixed(1) : "0.0";
            return [ETIQUETAS_REACTIVO[r], String(cantidad), `${porcentaje}%`];
        });

    pdf.autoTable({
        startY: 73,
        margin: { left: 15, right: 15 },
        tableWidth: (anchoPagina - 30) / 2 - 5,
        head: [["Reactivo", "Cantidad", "% del total"]],
        body: filasDistribucion,
        theme: "grid",
        headStyles: { fillColor: [46, 125, 50], textColor: 255, fontStyle: "bold", halign: "center" },
        styles: { fontSize: 9, cellPadding: 2.5, halign: "center", valign: "middle" }
    });

    const finTablaDistribucion = pdf.lastAutoTable.finalY;

    // ------------------------------------------------------------
    // Tabla: resultados (Reactivo/No Reactivo · Positivo/Negativo)
    // ------------------------------------------------------------

    const filasResultados = REACTIVOS.map(function (r) {

        const grupo = GRUPOS_RESULTADO[r];
        const opciones = OPCIONES_RESULTADO[grupo];

        const totalesResultado = {};
        opciones.forEach(function (o) { totalesResultado[o.valor] = 0; });

        let total = 0;

        entradas.forEach(function (e) {
            if (e.reactivo !== r) return;
            totalesResultado[e.resultado] = (totalesResultado[e.resultado] || 0) + e.cantidad;
            total += e.cantidad;
        });

        const opA = opciones[0];
        const opB = opciones[1];
        const cantA = totalesResultado[opA.valor] || 0;
        const cantB = totalesResultado[opB.valor] || 0;
        const pctA = total > 0 ? ((cantA / total) * 100).toFixed(1) : "0.0";
        const pctB = total > 0 ? ((cantB / total) * 100).toFixed(1) : "0.0";

        return [
            ETIQUETAS_REACTIVO[r],
            String(total),
            `${opA.etiqueta}: ${cantA} (${pctA}%)`,
            `${opB.etiqueta}: ${cantB} (${pctB}%)`
        ];

    });

    pdf.autoTable({
        startY: 73,
        margin: { left: anchoPagina / 2 + 2.5, right: 15 },
        tableWidth: (anchoPagina - 30) / 2 - 5,
        head: [["Reactivo", "Total", "Resultado A", "Resultado B"]],
        body: filasResultados,
        theme: "grid",
        headStyles: { fillColor: [25, 90, 145], textColor: 255, fontStyle: "bold", halign: "center" },
        styles: { fontSize: 8.5, cellPadding: 2.5, halign: "center", valign: "middle" }
    });

    const finTablaResultados = pdf.lastAutoTable.finalY;

    // ------------------------------------------------------------
    // Tabla: historial completo de pacientes
    // ------------------------------------------------------------

    const inicioHistorial = Math.max(finTablaDistribucion, finTablaResultados) + 10;

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.text("Historial completo de pacientes", 15, inicioHistorial);

    const ordenadas = entradas.slice().sort(function (a, b) {
        return parsearFecha(b.fecha) - parsearFecha(a.fecha) || b.id - a.id;
    });

    const filasHistorial = ordenadas.map(function (e) {

        const fecha = parsearFecha(e.fecha);
        const fechaTexto = `${formatearFechaCorta(fecha)}/${fecha.getFullYear()}`;
        const grupo = GRUPOS_RESULTADO[e.reactivo];
        const opcion = OPCIONES_RESULTADO[grupo].find(function (o) { return o.valor === e.resultado; });
        const etiquetaResultado = opcion ? opcion.etiqueta : e.resultado;

        return [
            fechaTexto,
            e.dni || "",
            e.apellido || "",
            e.nombre || "",
            ETIQUETAS_REACTIVO[e.reactivo],
            etiquetaResultado
        ];

    });

    pdf.autoTable({
        startY: inicioHistorial + 5,
        margin: { left: 15, right: 15 },
        head: [["Fecha", "DNI", "Apellido", "Nombre", "Reactivo", "Resultado"]],
        body: filasHistorial.length > 0 ? filasHistorial : [["—", "—", "—", "—", "—", "—"]],
        theme: "grid",
        headStyles: { fillColor: [40, 48, 54], textColor: 255, fontStyle: "bold", halign: "center" },
        styles: { fontSize: 8, cellPadding: 2, halign: "center", valign: "middle" }
    });

    // ------------------------------------------------------------
    // Pie de página
    // ------------------------------------------------------------

    const posicionFinal = pdf.lastAutoTable.finalY + 10;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.text(
        `Reporte generado automáticamente el ${fechaTexto} a las ${horaTexto}`,
        15,
        Math.min(posicionFinal, pdf.internal.pageSize.getHeight() - 10)
    );

    // ------------------------------------------------------------
    // Guardar
    // ------------------------------------------------------------

    const año = ahora.getFullYear();
    const mes = String(ahora.getMonth() + 1).padStart(2, "0");
    const dia = String(ahora.getDate()).padStart(2, "0");
    const hora = String(ahora.getHours()).padStart(2, "0");
    const minutos = String(ahora.getMinutes()).padStart(2, "0");

    const nombrePDF = `EstadisticaSerologia_${año}-${mes}-${dia}_${hora}-${minutos}.pdf`;

    pdf.save(nombrePDF);

}
