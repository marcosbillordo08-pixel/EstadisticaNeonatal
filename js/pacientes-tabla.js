(function () {
    const cuerpoTabla = document.getElementById("cuerpoTablaPacientesPlanilla");
    const buscador = document.getElementById("buscarPacientePlanilla");

    if (!cuerpoTabla || !buscador) return;

    function normalizar(valor) {
        return String(valor || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim();
    }

    function formatearFecha(valor) {
        if (!valor) return "—";

        const fecha = typeof valor.toDate === "function" ? valor.toDate() : new Date(valor);
        if (isNaN(fecha.getTime())) return "—";

        return fecha.toLocaleString("es-AR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    function obtenerPacientePorDni(dni) {
        if (typeof window.obtenerPacientesPlanilla !== "function") return null;

        return (window.obtenerPacientesPlanilla() || []).find(function (paciente) {
            return String(paciente.dni || "").trim() === dni;
        }) || null;
    }

    function corregirColumnas() {
        Array.from(cuerpoTabla.rows).forEach(function (fila) {
            // La versión anterior tenía 15 celdas y no incluía la fecha de carga.
            if (fila.cells.length !== 15) return;

            const dni = fila.cells[2] ? fila.cells[2].textContent.trim() : "";
            const paciente = obtenerPacientePorDni(dni);
            const celdaFecha = document.createElement("td");
            celdaFecha.textContent = formatearFecha(paciente ? (paciente.fechaCarga || paciente.id) : "");
            fila.insertBefore(celdaFecha, fila.firstChild);
        });
    }

    function filtrarTabla() {
        corregirColumnas();
        const busqueda = normalizar(buscador.value);

        Array.from(cuerpoTabla.rows).forEach(function (fila) {
            if (fila.cells.length !== 16) return;

            const textoFila = Array.from(fila.cells)
                .slice(1, 6)
                .map(function (celda) { return celda.textContent; })
                .join(" ");

            fila.style.display = !busqueda || normalizar(textoFila).includes(busqueda) ? "" : "none";
        });
    }

    buscador.addEventListener("input", filtrarTabla);

    new MutationObserver(filtrarTabla).observe(cuerpoTabla, { childList: true });
    filtrarTabla();
}());
