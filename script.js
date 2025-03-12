// Variables globales
let preguntas = [];
let todasLasPreguntas = []; // Para el modo estudio
let preguntaActual = 0;
let respuestasUsuario = [];
let tiempoInicio;
let temporizador;
let historialExamenes = [];
let flashcardIndex = 0;
let flashcardFlipped = false;
let ultimoExamen = null;
let categoriasFiltradas = [];
let preguntasFiltradas = [];
let categoriasTemporal = []; // Para almacenar selecciones temporales antes de aplicar

// Elementos DOM
const pantallas = {
    inicio: document.getElementById('pantalla-inicio'),
    examen: document.getElementById('pantalla-examen'),
    resultados: document.getElementById('pantalla-resultados'),
    respuestas: document.getElementById('pantalla-respuestas'),
    historial: document.getElementById('pantalla-historial'),
    detalles: document.getElementById('pantalla-detalles'),
    flashcards: document.getElementById('pantalla-flashcards')
};

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    // Cargar historial desde localStorage
    cargarHistorial();
    
    // Event listeners para botones de la pantalla de inicio
    document.getElementById('btn-iniciar-examen').addEventListener('click', iniciarExamen);
    document.getElementById('btn-ver-historial').addEventListener('click', mostrarHistorial);
    document.getElementById('btn-modo-estudio').addEventListener('click', iniciarModoEstudio);
    
    // Event listeners para botones de navegación en el examen
    document.getElementById('btn-anterior').addEventListener('click', irPreguntaAnterior);
    document.getElementById('btn-finalizar').addEventListener('click', finalizarExamen);
    
    // Event listeners para botones de resultados
    document.getElementById('btn-volver-inicio').addEventListener('click', volverInicio);
    document.getElementById('btn-ver-respuestas').addEventListener('click', verRespuestasUltimoExamen);
    
    // Event listeners para botones de respuestas
    document.getElementById('btn-volver-resultados').addEventListener('click', () => {
        ocultarPantalla(pantallas.respuestas);
        mostrarPantalla(pantallas.resultados);
    });
    
    // Event listeners para botones de historial
    document.getElementById('btn-volver-inicio-desde-historial').addEventListener('click', volverInicio);
    
    // Event listeners para botones de detalles
    document.getElementById('btn-volver-historial').addEventListener('click', () => {
        ocultarPantalla(pantallas.detalles);
        mostrarPantalla(pantallas.historial);
    });
    
    // Event listeners para botones de flashcards
    document.getElementById('btn-anterior-flashcard').addEventListener('click', mostrarFlashcardAnterior);
    document.getElementById('btn-siguiente-flashcard').addEventListener('click', mostrarFlashcardSiguiente);
    document.getElementById('flashcard').addEventListener('click', voltearFlashcard);
    document.getElementById('btn-volver-inicio-desde-flashcards').addEventListener('click', volverInicio);
    
    // Event listener para el botón de inicio desde el examen
    document.getElementById('btn-home-desde-examen').addEventListener('click', () => {
        if (confirm('¿Estás seguro de que deseas volver al inicio? Se perderá el progreso del examen actual.')) {
            clearInterval(temporizador);
            volverInicio();
        }
    });
    
    // Event listeners para el popup de filtro
    document.getElementById('btn-mostrar-filtro').addEventListener('click', mostrarPopupFiltro);
    document.getElementById('btn-cerrar-filtro').addEventListener('click', cerrarPopupFiltro);
    document.getElementById('btn-aplicar-filtro').addEventListener('click', aplicarFiltroSeleccionado);
    
    // Cerrar popup al hacer clic fuera de él
    document.addEventListener('click', (e) => {
        const popup = document.getElementById('popup-filtro');
        const btnFiltro = document.getElementById('btn-mostrar-filtro');
        
        if (popup.classList.contains('hidden')) return;
        
        if (!popup.contains(e.target) && e.target !== btnFiltro) {
            popup.classList.add('hidden');
        }
    });
});

// Funciones para cargar datos
async function cargarPreguntas() {
    try {
        const categorias = ['nefrologia', 'inmunologia', 'cardiologia', 'adolescentes'];
        let todasLasPreguntas = [];
        
        for (const categoria of categorias) {
            const response = await fetch(`${categoria}.json`);
            if (!response.ok) {
                throw new Error(`Error al cargar ${categoria}.json`);
            }
            const data = await response.json();
            todasLasPreguntas = [...todasLasPreguntas, ...data];
        }
        
        return todasLasPreguntas;
    } catch (error) {
        console.error('Error al cargar las preguntas:', error);
        alert('Error al cargar las preguntas. Por favor, recarga la página.');
        return [];
    }
}

function seleccionarPreguntasExamen(todasLasPreguntas) {
    // Agrupar preguntas por categoría
    const preguntasPorCategoria = {};
    todasLasPreguntas.forEach(pregunta => {
        if (!preguntasPorCategoria[pregunta.categoria]) {
            preguntasPorCategoria[pregunta.categoria] = [];
        }
        preguntasPorCategoria[pregunta.categoria].push(pregunta);
    });
    
    // Seleccionar preguntas proporcionalmente
    const totalPreguntas = 30;
    const categorias = Object.keys(preguntasPorCategoria);
    const preguntasPorCategoriaExamen = Math.floor(totalPreguntas / categorias.length);
    
    let preguntasSeleccionadas = [];
    
    categorias.forEach(categoria => {
        const preguntasCategoria = preguntasPorCategoria[categoria];
        // Mezclar preguntas de esta categoría
        const preguntasMezcladas = [...preguntasCategoria].sort(() => Math.random() - 0.5);
        // Tomar la cantidad necesaria
        preguntasSeleccionadas = [...preguntasSeleccionadas, ...preguntasMezcladas.slice(0, preguntasPorCategoriaExamen)];
    });
    
    // Si no llegamos a 30 preguntas, añadir más aleatoriamente
    if (preguntasSeleccionadas.length < totalPreguntas) {
        const preguntasFaltantes = totalPreguntas - preguntasSeleccionadas.length;
        const todasLasPreguntasMezcladas = [...todasLasPreguntas].sort(() => Math.random() - 0.5);
        
        let i = 0;
        let preguntasAgregadas = 0;
        
        while (preguntasAgregadas < preguntasFaltantes && i < todasLasPreguntasMezcladas.length) {
            const pregunta = todasLasPreguntasMezcladas[i];
            if (!preguntasSeleccionadas.includes(pregunta)) {
                preguntasSeleccionadas.push(pregunta);
                preguntasAgregadas++;
            }
            i++;
        }
    }
    
    // Mezclar el orden final de las preguntas
    return preguntasSeleccionadas.sort(() => Math.random() - 0.5);
}

function cargarHistorial() {
    const historialGuardado = localStorage.getItem('historialExamenes');
    if (historialGuardado) {
        historialExamenes = JSON.parse(historialGuardado);
    }
}

function guardarHistorial() {
    localStorage.setItem('historialExamenes', JSON.stringify(historialExamenes));
}

// Funciones para gestionar pantallas
function mostrarPantalla(pantalla) {
    pantalla.classList.remove('hidden');
    pantalla.classList.add('fade-in');
}

function ocultarPantalla(pantalla) {
    pantalla.classList.add('fade-out');
    setTimeout(() => {
        pantalla.classList.add('hidden');
        pantalla.classList.remove('fade-out');
    }, 300);
}

function ocultarTodasLasPantallas() {
    Object.values(pantallas).forEach(pantalla => {
        pantalla.classList.add('hidden');
    });
}

// Funciones para el examen
async function iniciarExamen() {
    // Mostrar un indicador de carga
    document.getElementById('btn-iniciar-examen').innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Cargando...';
    document.getElementById('btn-iniciar-examen').disabled = true;
    
    // Cargar preguntas
    todasLasPreguntas = await cargarPreguntas();
    if (todasLasPreguntas.length === 0) {
        document.getElementById('btn-iniciar-examen').innerHTML = '<i class="fas fa-play-circle mr-2"></i> Iniciar Examen';
        document.getElementById('btn-iniciar-examen').disabled = false;
        return;
    }
    
    // Seleccionar preguntas para el examen
    preguntas = seleccionarPreguntasExamen(todasLasPreguntas);
    
    // Inicializar variables
    preguntaActual = 0;
    respuestasUsuario = Array(preguntas.length).fill(null);
    
    // Actualizar UI
    document.getElementById('total-preguntas').textContent = preguntas.length;
    actualizarBarraProgreso();
    mostrarPreguntaActual();
    
    // Iniciar temporizador
    tiempoInicio = new Date();
    iniciarTemporizador();
    
    // Cambiar a pantalla de examen
    ocultarPantalla(pantallas.inicio);
    mostrarPantalla(pantallas.examen);
    
    // Restaurar botón
    document.getElementById('btn-iniciar-examen').innerHTML = '<i class="fas fa-play-circle mr-2"></i> Iniciar Examen';
    document.getElementById('btn-iniciar-examen').disabled = false;
}

function mostrarPreguntaActual() {
    const pregunta = preguntas[preguntaActual];
    
    // Actualizar número de pregunta
    document.getElementById('pregunta-actual').textContent = preguntaActual + 1;
    
    // Actualizar categoría
    document.getElementById('categoria-pregunta').textContent = pregunta.categoria;
    
    // Actualizar texto de la pregunta
    document.getElementById('texto-pregunta').textContent = pregunta.pregunta;
    
    // Generar opciones
    const contenedorOpciones = document.getElementById('opciones');
    contenedorOpciones.innerHTML = '';
    
    pregunta.opciones.forEach((opcion, indice) => {
        const divOpcion = document.createElement('div');
        divOpcion.className = `opcion ${respuestasUsuario[preguntaActual] === indice ? 'opcion-seleccionada' : ''}`;
        divOpcion.innerHTML = `
            <div class="opcion-indicator">${String.fromCharCode(65 + indice)}</div>
            <div class="opcion-texto">${opcion}</div>
        `;
        
        divOpcion.addEventListener('click', () => {
            seleccionarOpcion(indice);
        });
        
        contenedorOpciones.appendChild(divOpcion);
    });
    
    // Mostrar/ocultar botón finalizar según la posición
    const btnFinalizar = document.getElementById('btn-finalizar');
    if (preguntaActual === preguntas.length - 1) {
        btnFinalizar.classList.remove('hidden');
    } else {
        btnFinalizar.classList.add('hidden');
    }
}

function seleccionarOpcion(indice) {
    // Guardar respuesta
    respuestasUsuario[preguntaActual] = indice;
    
    // Actualizar UI
    const opciones = document.querySelectorAll('.opcion');
    opciones.forEach((opcion, i) => {
        if (i === indice) {
            opcion.classList.add('opcion-seleccionada');
        } else {
            opcion.classList.remove('opcion-seleccionada');
        }
    });
    
    // Avanzar a la siguiente pregunta automáticamente
    setTimeout(() => {
        if (preguntaActual < preguntas.length - 1) {
            irPreguntaSiguiente();
        }
    }, 500);
}

function irPreguntaAnterior() {
    if (preguntaActual > 0) {
        preguntaActual--;
        actualizarBarraProgreso();
        mostrarPreguntaActual();
    }
}

function irPreguntaSiguiente() {
    if (preguntaActual < preguntas.length - 1) {
        preguntaActual++;
        mostrarPreguntaActual();
        actualizarBarraProgreso();
    }
}

function actualizarBarraProgreso() {
    const porcentaje = ((preguntaActual + 1) / preguntas.length) * 100;
    document.getElementById('barra-progreso').style.width = `${porcentaje}%`;
}

function iniciarTemporizador() {
    const elementoTemporizador = document.getElementById('temporizador');
    
    temporizador = setInterval(() => {
        const ahora = new Date();
        const tiempoTranscurrido = Math.floor((ahora - tiempoInicio) / 1000);
        
        const minutos = Math.floor(tiempoTranscurrido / 60).toString().padStart(2, '0');
        const segundos = (tiempoTranscurrido % 60).toString().padStart(2, '0');
        
        elementoTemporizador.textContent = `${minutos}:${segundos}`;
    }, 1000);
}

function detenerTemporizador() {
    clearInterval(temporizador);
}

function finalizarExamen() {
    // Detener temporizador
    detenerTemporizador();
    
    // Calcular tiempo empleado
    const tiempoFin = new Date();
    const tiempoEmpleadoSegundos = Math.floor((tiempoFin - tiempoInicio) / 1000);
    const minutos = Math.floor(tiempoEmpleadoSegundos / 60).toString().padStart(2, '0');
    const segundos = (tiempoEmpleadoSegundos % 60).toString().padStart(2, '0');
    const tiempoEmpleado = `${minutos}:${segundos}`;
    
    // Calcular puntuación
    let puntuacion = 0;
    const detalles = [];
    
    preguntas.forEach((pregunta, indice) => {
        const opcionUsuario = respuestasUsuario[indice];
        const esCorrecta = opcionUsuario === pregunta.respuestaCorrecta;
        
        if (esCorrecta) {
            puntuacion++;
        }
        
        detalles.push({
            pregunta: pregunta.pregunta,
            opcionUsuario: opcionUsuario !== null ? pregunta.opciones[opcionUsuario] : "No respondida",
            opcionCorrecta: pregunta.opciones[pregunta.respuestaCorrecta],
            esCorrecta: esCorrecta,
            justificacion: pregunta.justificacion,
            fuente: pregunta.fuente,
            categoria: pregunta.categoria
        });
    });
    
    // Crear objeto de intento
    const fecha = new Date().toLocaleString();
    const intento = {
        fecha: fecha,
        puntuacion: puntuacion,
        total: preguntas.length,
        tiempo: tiempoEmpleado,
        detalles: detalles
    };
    
    // Guardar en historial
    historialExamenes.unshift(intento);
    guardarHistorial();
    
    // Guardar último examen para ver respuestas
    ultimoExamen = intento;
    
    // Actualizar UI de resultados
    document.getElementById('puntuacion').textContent = puntuacion;
    document.getElementById('total').textContent = preguntas.length;
    document.getElementById('porcentaje').textContent = Math.round((puntuacion / preguntas.length) * 100);
    document.getElementById('tiempo-empleado').textContent = tiempoEmpleado;
    
    // Generar resumen por categorías
    generarResumenCategorias(detalles);
    
    // Cambiar a pantalla de resultados
    ocultarPantalla(pantallas.examen);
    mostrarPantalla(pantallas.resultados);
}

function generarResumenCategorias(detalles) {
    // Agrupar por categoría
    const categorias = {};
    
    detalles.forEach(detalle => {
        if (!categorias[detalle.categoria]) {
            categorias[detalle.categoria] = {
                correctas: 0,
                total: 0
            };
        }
        
        categorias[detalle.categoria].total++;
        if (detalle.esCorrecta) {
            categorias[detalle.categoria].correctas++;
        }
    });
    
    // Generar filas de la tabla
    const tablaCategorias = document.getElementById('tabla-categorias');
    tablaCategorias.innerHTML = '';
    
    Object.entries(categorias).forEach(([categoria, datos]) => {
        const porcentaje = Math.round((datos.correctas / datos.total) * 100);
        
        const fila = document.createElement('tr');
        fila.innerHTML = `
            <td class="py-3 px-4 border-b">${categoria}</td>
            <td class="py-3 px-4 border-b text-center">${datos.correctas}</td>
            <td class="py-3 px-4 border-b text-center">${datos.total}</td>
            <td class="py-3 px-4 border-b text-center">
                <div class="flex items-center justify-center">
                    <div class="w-16 bg-gray-200 rounded-full h-2.5 mr-2">
                        <div class="bg-blue-600 h-2.5 rounded-full" style="width: ${porcentaje}%"></div>
                    </div>
                    <span>${porcentaje}%</span>
                </div>
            </td>
        `;
        
        tablaCategorias.appendChild(fila);
    });
}

// Función para ver respuestas del último examen
function verRespuestasUltimoExamen() {
    if (ultimoExamen) {
        // Generar detalles de cada pregunta
        const listaRespuestas = document.getElementById('lista-respuestas');
        listaRespuestas.innerHTML = '';
        
        ultimoExamen.detalles.forEach((detalle, indice) => {
            const divPregunta = document.createElement('div');
            divPregunta.className = `bg-white rounded-xl shadow-md p-5 mb-6 border-l-4 ${detalle.esCorrecta ? 'border-green-500' : 'border-red-500'}`;
            
            divPregunta.innerHTML = `
                <div class="flex flex-wrap items-center justify-between mb-3">
                    <div class="flex items-center mb-2 sm:mb-0">
                        <span class="inline-block bg-gray-100 text-gray-800 text-xs font-semibold px-2.5 py-1.5 rounded-full mr-2">
                            Pregunta ${indice + 1}
                        </span>
                        <span class="inline-block ${detalle.esCorrecta ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} text-xs font-semibold px-2.5 py-1.5 rounded-full">
                            ${detalle.esCorrecta ? '<i class="fas fa-check mr-1"></i> Correcta' : '<i class="fas fa-times mr-1"></i> Incorrecta'}
                        </span>
                    </div>
                    <span class="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                        ${detalle.categoria}
                    </span>
                </div>
                
                <h3 class="text-lg font-medium mb-4 text-gray-800">${detalle.pregunta}</h3>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div class="bg-gray-50 p-3 rounded-lg">
                        <p class="text-sm text-gray-600 mb-1 font-semibold">Tu respuesta:</p>
                        <p class="${detalle.esCorrecta ? 'text-green-600' : 'text-red-600'} font-medium">
                            ${detalle.opcionUsuario}
                        </p>
                    </div>
                    
                    ${!detalle.esCorrecta ? `
                    <div class="bg-green-50 p-3 rounded-lg">
                        <p class="text-sm text-gray-600 mb-1 font-semibold">Respuesta correcta:</p>
                        <p class="text-green-600 font-medium">${detalle.opcionCorrecta}</p>
                    </div>
                    ` : `
                    <div></div>
                    `}
                </div>
                
                <div class="bg-indigo-50 p-4 rounded-lg mb-3">
                    <p class="text-sm text-indigo-800 mb-2 font-semibold">Justificación:</p>
                    <p class="text-gray-800">${detalle.justificacion}</p>
                </div>
                
                <div class="text-xs text-gray-500 mt-3 italic text-right">
                    Fuente: ${detalle.fuente}
                </div>
            `;
            
            listaRespuestas.appendChild(divPregunta);
        });
        
        // Mostrar información general
        const infoExamen = document.getElementById('info-examen');
        const porcentaje = Math.round((ultimoExamen.puntuacion / ultimoExamen.total) * 100);
        
        infoExamen.innerHTML = `
            <div class="flex flex-wrap justify-between items-center">
                <div>
                    <p class="text-gray-600 mb-1">Fecha: <span class="font-medium">${ultimoExamen.fecha}</span></p>
                    <p class="text-gray-600">Tiempo: <span class="font-medium">${ultimoExamen.tiempo}</span></p>
                </div>
                <div class="text-center">
                    <p class="text-2xl font-bold ${porcentaje >= 70 ? 'text-green-600' : porcentaje >= 50 ? 'text-yellow-600' : 'text-red-600'}">${ultimoExamen.puntuacion}/${ultimoExamen.total}</p>
                    <p class="text-gray-600">${porcentaje}% de acierto</p>
                </div>
            </div>
        `;
        
        // Cambiar a pantalla de respuestas
        ocultarPantalla(pantallas.resultados);
        mostrarPantalla(pantallas.respuestas);
    }
}

// Funciones para el historial
function mostrarHistorial() {
    // Generar filas de la tabla de historial
    const tablaHistorial = document.getElementById('tabla-historial');
    tablaHistorial.innerHTML = '';
    
    if (historialExamenes.length === 0) {
        const fila = document.createElement('tr');
        fila.innerHTML = `
            <td colspan="4" class="py-6 text-center text-gray-500">
                <i class="fas fa-history text-gray-300 text-4xl mb-2"></i>
                <p>No hay exámenes realizados</p>
            </td>
        `;
        tablaHistorial.appendChild(fila);
    } else {
        historialExamenes.forEach((intento, indice) => {
            const porcentaje = Math.round((intento.puntuacion / intento.total) * 100);
            const colorClase = porcentaje >= 70 ? 'text-green-600' : porcentaje >= 50 ? 'text-yellow-600' : 'text-red-600';
            
            const fila = document.createElement('tr');
            fila.innerHTML = `
                <td class="py-3 px-4 border-b">${intento.fecha}</td>
                <td class="py-3 px-4 border-b text-center">
                    <span class="font-medium ${colorClase}">${intento.puntuacion}/${intento.total}</span>
                    <span class="text-xs text-gray-500 block">${porcentaje}%</span>
                </td>
                <td class="py-3 px-4 border-b text-center">${intento.tiempo}</td>
                <td class="py-3 px-4 border-b text-center">
                    <button class="bg-blue-500 text-white py-1.5 px-3 rounded-lg hover:bg-blue-600 transition text-sm btn-ver-detalles flex items-center mx-auto" data-indice="${indice}">
                        <i class="fas fa-eye mr-1"></i> Ver detalles
                    </button>
                </td>
            `;
            tablaHistorial.appendChild(fila);
        });
        
        // Añadir event listeners a los botones de ver detalles
        document.querySelectorAll('.btn-ver-detalles').forEach(boton => {
            boton.addEventListener('click', () => {
                const indice = parseInt(boton.getAttribute('data-indice'));
                mostrarDetallesIntento(indice);
            });
        });
    }
    
    // Cambiar a pantalla de historial
    ocultarTodasLasPantallas();
    mostrarPantalla(pantallas.historial);
}

function mostrarDetallesIntento(indice) {
    const intento = historialExamenes[indice];
    
    // Mostrar información general
    const infoIntento = document.getElementById('info-intento');
    const porcentaje = Math.round((intento.puntuacion / intento.total) * 100);
    
    infoIntento.innerHTML = `
        <div class="flex flex-wrap justify-between items-center">
            <div>
                <p class="text-gray-600 mb-1">Fecha: <span class="font-medium">${intento.fecha}</span></p>
                <p class="text-gray-600">Tiempo: <span class="font-medium">${intento.tiempo}</span></p>
            </div>
            <div class="text-center">
                <p class="text-2xl font-bold ${porcentaje >= 70 ? 'text-green-600' : porcentaje >= 50 ? 'text-yellow-600' : 'text-red-600'}">${intento.puntuacion}/${intento.total}</p>
                <p class="text-gray-600">${porcentaje}% de acierto</p>
            </div>
        </div>
    `;
    
    // Mostrar detalles de cada pregunta
    const listaPreguntas = document.getElementById('lista-preguntas');
    listaPreguntas.innerHTML = '';
    
    intento.detalles.forEach((detalle, indice) => {
        const divPregunta = document.createElement('div');
        divPregunta.className = `bg-white rounded-xl shadow-md p-5 mb-6 border-l-4 ${detalle.esCorrecta ? 'border-green-500' : 'border-red-500'}`;
        
        divPregunta.innerHTML = `
            <div class="flex flex-wrap items-center justify-between mb-3">
                <div class="flex items-center mb-2 sm:mb-0">
                    <span class="inline-block bg-gray-100 text-gray-800 text-xs font-semibold px-2.5 py-1.5 rounded-full mr-2">
                        Pregunta ${indice + 1}
                    </span>
                    <span class="inline-block ${detalle.esCorrecta ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} text-xs font-semibold px-2.5 py-1.5 rounded-full">
                        ${detalle.esCorrecta ? '<i class="fas fa-check mr-1"></i> Correcta' : '<i class="fas fa-times mr-1"></i> Incorrecta'}
                    </span>
                </div>
                <span class="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                    ${detalle.categoria}
                </span>
            </div>
            
            <h3 class="text-lg font-medium mb-4 text-gray-800">${detalle.pregunta}</h3>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div class="bg-gray-50 p-3 rounded-lg">
                    <p class="text-sm text-gray-600 mb-1 font-semibold">Tu respuesta:</p>
                    <p class="${detalle.esCorrecta ? 'text-green-600' : 'text-red-600'} font-medium">
                        ${detalle.opcionUsuario}
                    </p>
                </div>
                
                ${!detalle.esCorrecta ? `
                <div class="bg-green-50 p-3 rounded-lg">
                    <p class="text-sm text-gray-600 mb-1 font-semibold">Respuesta correcta:</p>
                    <p class="text-green-600 font-medium">${detalle.opcionCorrecta}</p>
                </div>
                ` : `
                <div></div>
                `}
            </div>
            
            <div class="bg-indigo-50 p-4 rounded-lg mb-3">
                <p class="text-sm text-indigo-800 mb-2 font-semibold">Justificación:</p>
                <p class="text-gray-800">${detalle.justificacion}</p>
            </div>
            
            <div class="text-xs text-gray-500 mt-3 italic text-right">
                Fuente: ${detalle.fuente}
            </div>
        `;
        
        listaPreguntas.appendChild(divPregunta);
    });
    
    // Cambiar a pantalla de detalles
    ocultarPantalla(pantallas.historial);
    mostrarPantalla(pantallas.detalles);
}

// Funciones para el modo estudio (flashcards)
async function iniciarModoEstudio() {
    // Mostrar un indicador de carga
    document.getElementById('btn-modo-estudio').innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Cargando...';
    document.getElementById('btn-modo-estudio').disabled = true;
    
    // Cargar todas las preguntas
    todasLasPreguntas = await cargarPreguntas();
    if (todasLasPreguntas.length === 0) {
        document.getElementById('btn-modo-estudio').innerHTML = '<i class="fas fa-book-open mr-2"></i> Modo Estudio';
        document.getElementById('btn-modo-estudio').disabled = false;
        return;
    }
    
    // Inicializar variables
    preguntas = todasLasPreguntas; // Usar todas las preguntas inicialmente
    preguntasFiltradas = preguntas;
    flashcardIndex = 0;
    flashcardFlipped = false;
    categoriasFiltradas = [];
    categoriasTemporal = [];
    
    // Generar filtros de categorías
    generarFiltrosCategorias();
    
    // Actualizar contador
    document.getElementById('flashcard-contador').textContent = `Tarjeta 1 de ${preguntasFiltradas.length}`;
    
    // Mostrar primera flashcard
    mostrarFlashcard(0);
    
    // Cambiar a pantalla de flashcards
    ocultarPantalla(pantallas.inicio);
    mostrarPantalla(pantallas.flashcards);
    
    // Restaurar botón
    document.getElementById('btn-modo-estudio').innerHTML = '<i class="fas fa-book-open mr-2"></i> Modo Estudio';
    document.getElementById('btn-modo-estudio').disabled = false;
}

function mostrarFlashcard(indice) {
    if (preguntasFiltradas.length === 0) {
        return;
    }
    
    const pregunta = preguntasFiltradas[indice];
    
    // Actualizar contador
    document.getElementById('flashcard-contador').textContent = `Tarjeta ${indice + 1} de ${preguntasFiltradas.length}`;
    
    // Actualizar contenido de la flashcard
    document.getElementById('flashcard-pregunta').textContent = pregunta.pregunta;
    document.getElementById('flashcard-respuesta').textContent = pregunta.opciones[pregunta.respuestaCorrecta];
    document.getElementById('flashcard-justificacion').textContent = pregunta.justificacion;
    document.getElementById('flashcard-fuente').textContent = `Fuente: ${pregunta.fuente}`;
    
    // Resetear estado de la flashcard
    flashcardFlipped = false;
    document.getElementById('flashcard-inner').classList.remove('flashcard-flip');
    
    // Habilitar/deshabilitar botones de navegación
    document.getElementById('btn-anterior-flashcard').disabled = indice === 0;
    document.getElementById('btn-siguiente-flashcard').disabled = indice === preguntasFiltradas.length - 1;
    
    if (indice === 0) {
        document.getElementById('btn-anterior-flashcard').classList.add('opacity-50', 'cursor-not-allowed');
    } else {
        document.getElementById('btn-anterior-flashcard').classList.remove('opacity-50', 'cursor-not-allowed');
    }
    
    if (indice === preguntasFiltradas.length - 1) {
        document.getElementById('btn-siguiente-flashcard').classList.add('opacity-50', 'cursor-not-allowed');
    } else {
        document.getElementById('btn-siguiente-flashcard').classList.remove('opacity-50', 'cursor-not-allowed');
    }
}

function voltearFlashcard() {
    flashcardFlipped = !flashcardFlipped;
    const flashcardInner = document.getElementById('flashcard-inner');
    
    if (flashcardFlipped) {
        flashcardInner.classList.add('flashcard-flip');
    } else {
        flashcardInner.classList.remove('flashcard-flip');
    }
}

function mostrarFlashcardAnterior() {
    if (flashcardIndex > 0) {
        flashcardIndex--;
        mostrarFlashcard(flashcardIndex);
    }
}

function mostrarFlashcardSiguiente() {
    if (flashcardIndex < preguntasFiltradas.length - 1) {
        flashcardIndex++;
        mostrarFlashcard(flashcardIndex);
    }
}

// Función para volver al inicio
function volverInicio() {
    ocultarTodasLasPantallas();
    mostrarPantalla(pantallas.inicio);
}

// Función para generar los filtros de categorías
function generarFiltrosCategorias() {
    // Categorías específicas de los archivos JSON
    const categorias = ['Nefrología', 'Inmunología', 'Cardiología', 'Adolescentes'];
    
    // Generar opciones de filtro
    const contenedorFiltros = document.getElementById('filtro-categorias');
    contenedorFiltros.innerHTML = '';
    
    // Añadir opción para "Todas"
    const divTodas = document.createElement('div');
    divTodas.className = 'flex items-center p-3 bg-gray-50 rounded-lg';
    
    const inputTodas = document.createElement('input');
    inputTodas.type = 'checkbox';
    inputTodas.id = 'filtro-todas';
    inputTodas.className = 'mr-3 h-5 w-5 text-purple-600 rounded';
    inputTodas.checked = categoriasFiltradas.length === 0;
    inputTodas.addEventListener('change', () => {
        if (inputTodas.checked) {
            // Desmarcar todas las categorías
            document.querySelectorAll('#filtro-categorias input[data-categoria]').forEach(input => {
                input.checked = false;
            });
            categoriasTemporal = [];
        }
    });
    
    const labelTodas = document.createElement('label');
    labelTodas.htmlFor = 'filtro-todas';
    labelTodas.className = 'text-gray-800 font-medium text-lg flex-grow';
    labelTodas.textContent = 'Todas las categorías';
    
    divTodas.appendChild(inputTodas);
    divTodas.appendChild(labelTodas);
    contenedorFiltros.appendChild(divTodas);
    
    // Añadir opciones para cada categoría
    categorias.forEach(categoria => {
        const divCategoria = document.createElement('div');
        divCategoria.className = 'flex items-center p-3 bg-gray-50 rounded-lg';
        
        const inputCategoria = document.createElement('input');
        inputCategoria.type = 'checkbox';
        inputCategoria.id = `filtro-${categoria.toLowerCase()}`;
        inputCategoria.className = 'mr-3 h-5 w-5 text-purple-600 rounded';
        inputCategoria.dataset.categoria = categoria;
        inputCategoria.checked = categoriasFiltradas.includes(categoria);
        
        inputCategoria.addEventListener('change', () => {
            // Actualizar array temporal
            if (inputCategoria.checked) {
                if (!categoriasTemporal.includes(categoria)) {
                    categoriasTemporal.push(categoria);
                }
                // Desmarcar "Todas" si se selecciona alguna categoría
                document.getElementById('filtro-todas').checked = false;
            } else {
                const index = categoriasTemporal.indexOf(categoria);
                if (index !== -1) {
                    categoriasTemporal.splice(index, 1);
                }
                // Marcar "Todas" si no hay categorías seleccionadas
                document.getElementById('filtro-todas').checked = categoriasTemporal.length === 0;
            }
        });
        
        const labelCategoria = document.createElement('label');
        labelCategoria.htmlFor = `filtro-${categoria.toLowerCase()}`;
        labelCategoria.className = 'text-gray-800 font-medium text-lg flex-grow';
        labelCategoria.textContent = categoria;
        
        divCategoria.appendChild(inputCategoria);
        divCategoria.appendChild(labelCategoria);
        contenedorFiltros.appendChild(divCategoria);
    });
    
    // Inicializar categorías temporales con las actuales
    categoriasTemporal = [...categoriasFiltradas];
}

// Función para aplicar el filtro seleccionado
function aplicarFiltroSeleccionado() {
    // Actualizar categorías filtradas con las selecciones temporales
    categoriasFiltradas = [...categoriasTemporal];
    
    // Aplicar filtros
    aplicarFiltros();
    
    // Cerrar popup
    cerrarPopupFiltro();
    
    // Actualizar indicador visual de filtro activo
    const btnFiltro = document.getElementById('btn-mostrar-filtro');
    if (categoriasFiltradas.length > 0) {
        btnFiltro.classList.add('bg-purple-600', 'text-white');
        btnFiltro.classList.remove('bg-gray-200', 'text-gray-700');
        
        // Mostrar categorías seleccionadas en el botón
        if (categoriasFiltradas.length === 1) {
            btnFiltro.innerHTML = `<i class="fas fa-filter mr-2"></i> ${categoriasFiltradas[0]}`;
        } else {
            btnFiltro.innerHTML = `<i class="fas fa-filter mr-2"></i> ${categoriasFiltradas.length} categorías`;
        }
    } else {
        btnFiltro.classList.remove('bg-purple-600', 'text-white');
        btnFiltro.classList.add('bg-gray-200', 'text-gray-700');
        btnFiltro.innerHTML = `<i class="fas fa-filter mr-2"></i> Filtrar`;
    }
}

// Función para mostrar el popup de filtro
function mostrarPopupFiltro() {
    // Actualizar las opciones de filtro antes de mostrar el popup
    actualizarOpcionesFiltro();
    
    // Mostrar el popup
    document.getElementById('popup-filtro').classList.remove('hidden');
    document.body.classList.add('overflow-hidden'); // Evitar scroll en el fondo
}

// Función para cerrar el popup de filtro
function cerrarPopupFiltro() {
    document.getElementById('popup-filtro').classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
}

// Función para actualizar las opciones de filtro en el popup
function actualizarOpcionesFiltro() {
    // Categorías específicas de los archivos JSON
    const categorias = ['Nefrología', 'Inmunología', 'Cardiología', 'Adolescentes'];
    
    // Generar opciones de filtro
    const contenedorFiltros = document.getElementById('filtro-categorias');
    contenedorFiltros.innerHTML = '';
    
    // Añadir opción para "Todas"
    const divTodas = document.createElement('div');
    divTodas.className = 'flex items-center p-3 bg-gray-50 rounded-lg';
    
    const inputTodas = document.createElement('input');
    inputTodas.type = 'checkbox';
    inputTodas.id = 'filtro-todas';
    inputTodas.className = 'mr-3 h-5 w-5 text-purple-600 rounded';
    inputTodas.checked = categoriasFiltradas.length === 0;
    inputTodas.addEventListener('change', () => {
        if (inputTodas.checked) {
            // Desmarcar todas las categorías
            document.querySelectorAll('#filtro-categorias input[data-categoria]').forEach(input => {
                input.checked = false;
            });
            categoriasTemporal = [];
        }
    });
    
    const labelTodas = document.createElement('label');
    labelTodas.htmlFor = 'filtro-todas';
    labelTodas.className = 'text-gray-800 font-medium text-lg flex-grow';
    labelTodas.textContent = 'Todas las categorías';
    
    divTodas.appendChild(inputTodas);
    divTodas.appendChild(labelTodas);
    contenedorFiltros.appendChild(divTodas);
    
    // Añadir opciones para cada categoría
    categorias.forEach(categoria => {
        const divCategoria = document.createElement('div');
        divCategoria.className = 'flex items-center p-3 bg-gray-50 rounded-lg';
        
        const inputCategoria = document.createElement('input');
        inputCategoria.type = 'checkbox';
        inputCategoria.id = `filtro-${categoria.toLowerCase()}`;
        inputCategoria.className = 'mr-3 h-5 w-5 text-purple-600 rounded';
        inputCategoria.dataset.categoria = categoria;
        inputCategoria.checked = categoriasFiltradas.includes(categoria);
        
        inputCategoria.addEventListener('change', () => {
            // Actualizar array temporal
            if (inputCategoria.checked) {
                if (!categoriasTemporal.includes(categoria)) {
                    categoriasTemporal.push(categoria);
                }
                // Desmarcar "Todas" si se selecciona alguna categoría
                document.getElementById('filtro-todas').checked = false;
            } else {
                const index = categoriasTemporal.indexOf(categoria);
                if (index !== -1) {
                    categoriasTemporal.splice(index, 1);
                }
                // Marcar "Todas" si no hay categorías seleccionadas
                document.getElementById('filtro-todas').checked = categoriasTemporal.length === 0;
            }
        });
        
        const labelCategoria = document.createElement('label');
        labelCategoria.htmlFor = `filtro-${categoria.toLowerCase()}`;
        labelCategoria.className = 'text-gray-800 font-medium text-lg flex-grow';
        labelCategoria.textContent = categoria;
        
        divCategoria.appendChild(inputCategoria);
        divCategoria.appendChild(labelCategoria);
        contenedorFiltros.appendChild(divCategoria);
    });
    
    // Inicializar categorías temporales con las actuales
    categoriasTemporal = [...categoriasFiltradas];
}
   