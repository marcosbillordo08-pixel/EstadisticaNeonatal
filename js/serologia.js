const COLECCION = "analisisSerologia";

        const REACTIVOS = ["VDRL", "HIV", "HEPATITIS B", "TOXOPLASMOSIS", "CHAGAS", "PCR"];

        const ETIQUETAS_REACTIVO = {
            "VDRL": "VDRL",
            "HIV": "HIV",
            "HEPATITIS B": "Hepatitis B",
            "TOXOPLASMOSIS": "Toxoplasmosis",
            "CHAGAS": "Chagas",
            "PCR": "PCR"
        };

        const GRUPOS_RESULTADO = {
            "VDRL": "REACTIVO_NOREACTIVO",
            "HIV": "REACTIVO_NOREACTIVO",
            "HEPATITIS B": "REACTIVO_NOREACTIVO",
            "TOXOPLASMOSIS": "POSITIVO_NEGATIVO",
            "CHAGAS": "POSITIVO_NEGATIVO",
            "PCR": "POSITIVO_NEGATIVO"
        };

        const OPCIONES_RESULTADO = {
            "REACTIVO_NOREACTIVO": [
                { valor: "REACTIVO", etiqueta: "Reactivo" },
                { valor: "NO_REACTIVO", etiqueta: "No Reactivo" }
            ],
            "POSITIVO_NEGATIVO": [
                { valor: "POSITIVO", etiqueta: "Positivo" },
                { valor: "NEGATIVO", etiqueta: "Negativo" }
            ]
        };

        let entradas = [];

function iniciarEscuchaDatos() {

            listenerMovimientos = db.collection(COLECCION)
                .orderBy("id", "asc")
                .onSnapshot(function (snapshot) {

                    entradas = [];
                    snapshot.forEach(function (docSnap) {
                        entradas.push(docSnap.data());
                    });

                    renderizarTodo();

                }, function (error) {
                    console.error("Error escuchando datos:", error);
                });

        }

        function parsearFecha(fechaISO) {
            const [y, m, d] = fechaISO.split("-").map(Number);
            return new Date(y, m - 1, d);
        }

        function formatearFechaCorta(fecha) {
            const dia = String(fecha.getDate()).padStart(2, "0");
            const mes = String(fecha.getMonth() + 1).padStart(2, "0");
            return `${dia}/${mes}`;
        }

        function obtenerRangoSemana(fecha) {
            const diaSemana = fecha.getDay() || 7;
            const lunes = new Date(fecha);
            lunes.setDate(fecha.getDate() - diaSemana + 1);
            const domingo = new Date(lunes);
            domingo.setDate(lunes.getDate() + 6);
            return { lunes, domingo };
        }

        function obtenerNumeroSemanaISO(fecha) {
            const d = new Date(Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()));
            const diaSemana = d.getUTCDay() || 7;
            d.setUTCDate(d.getUTCDate() + 4 - diaSemana);
            const inicioAño = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
            const numero = Math.ceil((((d - inicioAño) / 86400000) + 1) / 7);
            return { año: d.getUTCFullYear(), semana: numero };
        }

        function claveSemana(fecha) {
            const { año, semana } = obtenerNumeroSemanaISO(fecha);
            return `${año}-S${String(semana).padStart(2, "0")}`;
        }

        function etiquetaSemana(fecha) {
            const { lunes, domingo } = obtenerRangoSemana(fecha);
            const { semana } = obtenerNumeroSemanaISO(fecha);
            return `Sem. ${semana} (${formatearFechaCorta(lunes)} al ${formatearFechaCorta(domingo)})`;
        }

        const NOMBRES_MES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
            "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

        function claveMes(fecha) {
            return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`;
        }

        function etiquetaMes(fecha) {
            return `${NOMBRES_MES[fecha.getMonth()]} ${fecha.getFullYear()}`;
        }

        function claveAño(fecha) {
            return String(fecha.getFullYear());
        }

        const inputDni = document.getElementById("dni");
        const inputApellido = document.getElementById("apellido");
        const inputNombre = document.getElementById("nombre");
        const inputFecha = document.getElementById("fecha");
        const inputReactivo = document.getElementById("reactivo");
        const inputResultado = document.getElementById("resultado");
        const btnAgregar = document.getElementById("btnAgregar");

        function fechaHoyISO() {
            const hoy = new Date();
            const y = hoy.getFullYear();
            const m = String(hoy.getMonth() + 1).padStart(2, "0");
            const d = String(hoy.getDate()).padStart(2, "0");
            return `${y}-${m}-${d}`;
        }

        inputFecha.value = fechaHoyISO();

        function actualizarOpcionesResultado() {
            const grupo = GRUPOS_RESULTADO[inputReactivo.value];
            const opciones = OPCIONES_RESULTADO[grupo];
            inputResultado.innerHTML = opciones.map(function (o) {
                return `<option value="${o.valor}">${o.etiqueta}</option>`;
            }).join("");
        }

        inputReactivo.addEventListener("change", actualizarOpcionesResultado);
        actualizarOpcionesResultado();

        // si el DNI ya se cargó antes, autocompleta Apellido y Nombre
        // (mismo criterio que el código de barras en StockLab)
        inputDni.addEventListener("blur", function () {

            const dni = inputDni.value.trim();
            if (!dni) return;

            const anterior = entradas
                .slice()
                .reverse()
                .find(function (e) { return e.dni === dni; });

            if (anterior) {
                inputApellido.value = anterior.apellido;
                inputNombre.value = anterior.nombre;
            }

        });

        btnAgregar.addEventListener("click", async function () {

            const dni = inputDni.value.trim();
            const apellido = inputApellido.value.trim();
            const nombre = inputNombre.value.trim();
            const fecha = inputFecha.value;
            const reactivo = inputReactivo.value;
            const resultado = inputResultado.value;

            if (!dni) {
                alert("Ingresá el DNI del paciente.");
                return;
            }

            if (!apellido || !nombre) {
                alert("Ingresá apellido y nombre del paciente.");
                return;
            }

            if (!fecha) {
                alert("Elegí una fecha.");
                return;
            }

            btnAgregar.disabled = true;

            try {

                const entrada = {
                    id: Date.now(),
                    dni: dni,
                    apellido: apellido,
                    nombre: nombre,
                    fecha: fecha,
                    reactivo: reactivo,
                    resultado: resultado,
                    cantidad: 1
                };

                await db.collection(COLECCION).doc(String(entrada.id)).set(entrada);

                // se dejan DNI/Apellido/Nombre cargados por si hay que
                // agregarle otro análisis al mismo paciente a continuación

            } catch (error) {
                console.error(error);
                alert("No se pudo guardar el análisis: " + error.message);
            } finally {
                btnAgregar.disabled = false;
            }

        });

        document.getElementById("btnBorrarTodo").addEventListener("click", async function () {

            if (entradas.length === 0) return;

            const confirmar = confirm("¿Borrar todo el historial cargado? Esta acción no se puede deshacer y afecta a todos los usuarios.");
            if (!confirmar) return;

            try {

                const grupos = [];
                for (let i = 0; i < entradas.length; i += 450) {
                    grupos.push(entradas.slice(i, i + 450));
                }

                for (const grupo of grupos) {
                    const lote = db.batch();
                    grupo.forEach(function (entrada) {
                        lote.delete(db.collection(COLECCION).doc(String(entrada.id)));
                    });
                    await lote.commit();
                }

            } catch (error) {
                console.error(error);
                alert("No se pudo borrar todo: " + error.message);
            }

        });

        async function eliminarEntrada(id) {
            try {
                await db.collection(COLECCION).doc(String(id)).delete();
            } catch (error) {
                console.error(error);
                alert("No se pudo eliminar: " + error.message);
            }
        }

        function totalEnRango(desde, hasta) {
            return entradas
                .filter(function (e) {
                    const f = parsearFecha(e.fecha);
                    return f >= desde && f <= hasta;
                })
                .reduce(function (acc, e) { return acc + e.cantidad; }, 0);
        }

        function renderizarCards() {

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

            document.getElementById("cards").innerHTML = `
                <div class="card">
                    <h3>📅 Esta semana</h3>
                    <div class="valor">${totalSemana}</div>
                    <div class="detalle">${formatearFechaCorta(lunes)} al ${formatearFechaCorta(domingo)}</div>
                </div>
                <div class="card">
                    <h3>🗓️ Este mes</h3>
                    <div class="valor">${totalMes}</div>
                    <div class="detalle">${NOMBRES_MES[hoy.getMonth()]} ${hoy.getFullYear()}</div>
                </div>
                <div class="card">
                    <h3>📆 Este año</h3>
                    <div class="valor">${totalAño}</div>
                    <div class="detalle">${hoy.getFullYear()}</div>
                </div>
                <div class="card">
                    <h3>🗃️ Total histórico</h3>
                    <div class="valor">${totalHistorico}</div>
                    <div class="detalle">${entradas.length} carga${entradas.length === 1 ? "" : "s"}</div>
                </div>
            `;

        }

        let periodoActivo = "semana";

        document.querySelectorAll(".tab-periodo").forEach(function (boton) {
            boton.addEventListener("click", function () {
                document.querySelectorAll(".tab-periodo").forEach(function (b) { b.classList.remove("activo"); });
                boton.classList.add("activo");
                periodoActivo = boton.dataset.periodo;
                renderizarTablaPeriodo();
            });
        });

        function renderizarTablaPeriodo() {

            const cuerpo = document.getElementById("cuerpoTablaPeriodo");

            if (entradas.length === 0) {
                cuerpo.innerHTML = `<tr><td colspan="8" class="sin-datos">Todavía no cargaste ningún análisis.</td></tr>`;
                return;
            }

            const grupos = {};

            entradas.forEach(function (e) {

                const fecha = parsearFecha(e.fecha);
                let clave, etiqueta;

                if (periodoActivo === "semana") {
                    clave = claveSemana(fecha);
                    etiqueta = etiquetaSemana(fecha);
                } else if (periodoActivo === "mes") {
                    clave = claveMes(fecha);
                    etiqueta = etiquetaMes(fecha);
                } else {
                    clave = claveAño(fecha);
                    etiqueta = claveAño(fecha);
                }

                if (!grupos[clave]) {
                    grupos[clave] = { etiqueta: etiqueta, orden: fecha.getTime(), porReactivo: {} };
                    REACTIVOS.forEach(function (r) { grupos[clave].porReactivo[r] = 0; });
                }

                grupos[clave].porReactivo[e.reactivo] += e.cantidad;

            });

            const filas = Object.values(grupos).sort(function (a, b) { return b.orden - a.orden; });

            cuerpo.innerHTML = filas.map(function (fila) {

                const total = REACTIVOS.reduce(function (acc, r) { return acc + fila.porReactivo[r]; }, 0);

                const celdas = REACTIVOS.map(function (r) {
                    return `<td>${fila.porReactivo[r] || 0}</td>`;
                }).join("");

                return `<tr><td>${fila.etiqueta}</td>${celdas}<td class="col-total">${total}</td></tr>`;

            }).join("");

        }

        function renderizarTablaPorcentaje() {

            const cuerpo = document.getElementById("cuerpoTablaPorcentaje");
            const totalHistorico = entradas.reduce(function (acc, e) { return acc + e.cantidad; }, 0);

            if (totalHistorico === 0) {
                cuerpo.innerHTML = `<tr><td colspan="3" class="sin-datos">Todavía no hay datos para calcular porcentajes.</td></tr>`;
                return;
            }

            const totalesPorReactivo = {};
            REACTIVOS.forEach(function (r) { totalesPorReactivo[r] = 0; });

            entradas.forEach(function (e) {
                totalesPorReactivo[e.reactivo] += e.cantidad;
            });

            cuerpo.innerHTML = REACTIVOS
                .slice()
                .sort(function (a, b) { return totalesPorReactivo[b] - totalesPorReactivo[a]; })
                .map(function (r) {
                    const cantidad = totalesPorReactivo[r];
                    const porcentaje = ((cantidad / totalHistorico) * 100).toFixed(1);
                    return `
                        <tr>
                            <td>${ETIQUETAS_REACTIVO[r]}</td>
                            <td>${cantidad}</td>
                            <td>
                                <span class="barra-porcentaje" style="width:${Math.max(porcentaje, 2)}px"></span>${porcentaje}%
                            </td>
                        </tr>
                    `;
                }).join("");

        }

        function renderizarTablaResultados() {

            const cuerpo = document.getElementById("cuerpoTablaResultados");

            if (entradas.length === 0) {
                cuerpo.innerHTML = `<tr><td colspan="8" class="sin-datos">Todavía no hay datos.</td></tr>`;
                return;
            }

            cuerpo.innerHTML = REACTIVOS.map(function (r) {

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

                const claseA = (opA.valor === "REACTIVO" || opA.valor === "POSITIVO") ? "pill-positivo" : "pill-negativo";
                const claseB = (opB.valor === "REACTIVO" || opB.valor === "POSITIVO") ? "pill-positivo" : "pill-negativo";

                return `
                    <tr>
                        <td>${ETIQUETAS_REACTIVO[r]}</td>
                        <td class="col-total">${total}</td>
                        <td><span class="pill ${claseA}">${opA.etiqueta}</span></td>
                        <td>${cantA}</td>
                        <td>${pctA}%</td>
                        <td><span class="pill ${claseB}">${opB.etiqueta}</span></td>
                        <td>${cantB}</td>
                        <td>${pctB}%</td>
                    </tr>
                `;

            }).join("");

        }

        function renderizarHistorial() {

            const cuerpo = document.getElementById("cuerpoHistorial");

            if (entradas.length === 0) {
                cuerpo.innerHTML = `<tr><td colspan="7" class="sin-datos">Sin cargas todavía.</td></tr>`;
                return;
            }

            const ordenadas = entradas.slice().sort(function (a, b) {
                return parsearFecha(b.fecha) - parsearFecha(a.fecha) || b.id - a.id;
            });

            cuerpo.innerHTML = ordenadas.map(function (e) {

                const fecha = parsearFecha(e.fecha);
                const fechaTexto = `${formatearFechaCorta(fecha)}/${fecha.getFullYear()}`;
                const grupo = GRUPOS_RESULTADO[e.reactivo];
                const opcion = OPCIONES_RESULTADO[grupo].find(function (o) { return o.valor === e.resultado; });
                const etiquetaResultado = opcion ? opcion.etiqueta : e.resultado;
                const clase = (e.resultado === "REACTIVO" || e.resultado === "POSITIVO") ? "pill-positivo" : "pill-negativo";

                return `
                    <tr>
                        <td>${fechaTexto}</td>
                        <td>${e.dni || ""}</td>
                        <td>${e.apellido || ""}</td>
                        <td>${e.nombre || ""}</td>
                        <td>${ETIQUETAS_REACTIVO[e.reactivo]}</td>
                        <td><span class="pill ${clase}">${etiquetaResultado}</span></td>
                        <td><button class="fila-historial-eliminar" data-id="${e.id}" type="button">🗑️</button></td>
                    </tr>
                `;

            }).join("");

            cuerpo.querySelectorAll(".fila-historial-eliminar").forEach(function (boton) {
                boton.addEventListener("click", function () {
                    eliminarEntrada(Number(boton.dataset.id));
                });
            });

        }

        function renderizarTodo() {
            renderizarCards();
            renderizarTablaPeriodo();
            renderizarTablaPorcentaje();
            renderizarTablaResultados();
            renderizarHistorial();

            if (typeof twemoji !== "undefined") {
                twemoji.parse(document.body, { folder: "svg", ext: ".svg" });
            }
        }

        renderizarTodo();
