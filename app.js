let productos = cargarLocalStorage("productos");
let ventas = cargarLocalStorage("ventas");
let movimientos = cargarLocalStorage("movimientos");
let cortes = cargarLocalStorage("cortes");
let fechaUltimoCorte = localStorage.getItem("fechaUltimoCorte") || "";
let ventaActual = [];
let productoSeleccionadoVenta = null;
let productoStockSeleccionado = null;
let tipoMovimientoStock = "entrada";
let accionAdminPendiente = null;
let accionConfirmacionPendiente = null;

const CLAVE_ADMIN = "1234";

productos = normalizarProductos(productos);

function cargarLocalStorage(clave) {
  try {
    const datos = localStorage.getItem(clave);
    return datos ? JSON.parse(datos) : [];
  } catch (error) {
    return [];
  }
}

function normalizarProductos(lista) {
  return lista.map(function(p) {
    if (!p.presentaciones || !Array.isArray(p.presentaciones) || p.presentaciones.length === 0) {
      const precio = Number(p.precioVenta) || 0;

      if (precio > 0) {
        p.presentaciones = [{ nombre: "Unidad", precio: precio, descuenta: 1 }];
      } else {
        p.presentaciones = [];
      }
    }

    if (!p.unidadBase) p.unidadBase = "unidad";
    if (p.stockMinimo === undefined) p.stockMinimo = 0;
    if (!p.ubicacion) p.ubicacion = "";

    return p;
  });
}

function guardarDatos() {
  localStorage.setItem("productos", JSON.stringify(productos));
  localStorage.setItem("ventas", JSON.stringify(ventas));
  localStorage.setItem("movimientos", JSON.stringify(movimientos));
  localStorage.setItem("cortes", JSON.stringify(cortes));
}

function obtenerValor(id) {
  const elemento = document.getElementById(id);
  return elemento ? elemento.value.trim() : "";
}

function obtenerNumero(id) {
  const valor = Number(obtenerValor(id));
  return isNaN(valor) ? 0 : valor;
}

function mostrarMensaje(texto, titulo = "Aviso", tipo = "aviso") {
  const modal = document.getElementById("mensajeModal");
  const tituloModal = document.getElementById("mensajeTitulo");
  const textoModal = document.getElementById("mensajeTexto");
  const imagenModal = document.getElementById("mensajeImagen");

  if (!modal || !tituloModal || !textoModal || !imagenModal) {
    alert(titulo + "\n" + texto);
    return;
  }

  tituloModal.textContent = titulo;
  textoModal.textContent = texto;

  if (tipo === "exito") {
    imagenModal.src = "img_exito.png";
  } else if (tipo === "error") {
    imagenModal.src = "img_error.png";
  } else if (tipo === "admin") {
    imagenModal.src = "img_admin.png";
  } else {
    imagenModal.src = "img_aviso.png";
  }

  modal.style.display = "flex";
}

function cerrarMensaje() {
  const modal = document.getElementById("mensajeModal");
  if (modal) modal.style.display = "none";
}

function pedirClaveAdmin(accionDespues) {
  accionAdminPendiente = accionDespues;

  const input = document.getElementById("adminClaveInput");
  const modal = document.getElementById("adminModal");

  if (!input || !modal) {
    mostrarMensaje("No se encontró el modal de administrador.", "Error", "error");
    return;
  }

  input.value = "";
  modal.style.display = "flex";

  setTimeout(function() {
    input.focus();
  }, 200);
}

function confirmarClaveAdmin() {
  const input = document.getElementById("adminClaveInput");
  const modal = document.getElementById("adminModal");

  if (!input || !modal) return;

  const clave = input.value;
  const accion = accionAdminPendiente;

  if (clave !== CLAVE_ADMIN) {
    mostrarMensaje("Contraseña incorrecta.", "Error", "error");
    return;
  }

  modal.style.display = "none";
  accionAdminPendiente = null;

  if (typeof accion === "function") accion();
}

function cerrarAdminModal() {
  const modal = document.getElementById("adminModal");
  if (modal) modal.style.display = "none";
  accionAdminPendiente = null;
}

function mostrarConfirmacion(titulo, texto, accionSi) {
  accionConfirmacionPendiente = accionSi;

  const modal = document.getElementById("confirmacionModal");
  const tituloElemento = document.getElementById("confirmacionTitulo");
  const textoElemento = document.getElementById("confirmacionTexto");

  if (!modal || !tituloElemento || !textoElemento) {
    if (confirm(texto) && typeof accionSi === "function") accionSi();
    accionConfirmacionPendiente = null;
    return;
  }

  tituloElemento.textContent = titulo;
  textoElemento.textContent = texto;
  modal.style.display = "flex";
}

function confirmarAccionGeneral() {
  const modal = document.getElementById("confirmacionModal");
  const accion = accionConfirmacionPendiente;

  if (modal) modal.style.display = "none";
  accionConfirmacionPendiente = null;

  if (typeof accion === "function") accion();
}

function cerrarConfirmacionModal() {
  const modal = document.getElementById("confirmacionModal");
  if (modal) modal.style.display = "none";
  accionConfirmacionPendiente = null;
}

function mostrarApartado(nombre) {
  const apartados = document.querySelectorAll(".apartado");
  const botones = document.querySelectorAll(".menu button");

  apartados.forEach(function(apartado) {
    apartado.classList.remove("activo-apartado");
  });

  botones.forEach(function(boton) {
    boton.classList.remove("activo");
  });

  const apartadoActivo = document.getElementById(nombre);
  const botonActivo = document.getElementById("btn-" + nombre);

  if (apartadoActivo) apartadoActivo.classList.add("activo-apartado");
  if (botonActivo) botonActivo.classList.add("activo");

  mostrarProductos();
  mostrarVentas();
  mostrarVentaActual();
  mostrarMovimientos();
  actualizarResumen();
}

function leerPresentaciones() {
  const presentaciones = [];

  for (let i = 1; i <= 4; i++) {
    const nombre = obtenerValor("presNombre" + i);
    const precio = obtenerNumero("presPrecio" + i);
    const descuenta = obtenerNumero("presDescuento" + i);

    if (nombre !== "" && precio > 0 && descuenta > 0) {
      presentaciones.push({ nombre: nombre, precio: precio, descuenta: descuenta });
    }
  }

  return presentaciones;
}

function guardarProducto() {
  pedirClaveAdmin(function() {
    guardarProductoAdmin();
  });
}

function guardarProductoAdmin() {
  const editandoId = obtenerValor("editandoId");
  const codigo = obtenerValor("codigo");
  const nombre = obtenerValor("nombre");
  const autor = obtenerValor("autor");
  const precioCompra = obtenerNumero("precioCompra");
  const stock = obtenerNumero("stock");
  const stockMinimo = obtenerNumero("stockMinimo");
  const unidadBase = obtenerValor("unidadBase") || "unidad";
  const ubicacion = obtenerValor("ubicacion");
  const presentaciones = leerPresentaciones();

  if (codigo === "") {
    mostrarMensaje("Debes escribir el código del producto.", "Aviso", "aviso");
    return;
  }

  if (nombre === "") {
    mostrarMensaje("Debes escribir el nombre del producto.", "Aviso", "aviso");
    return;
  }

  if (stock < 0) {
    mostrarMensaje("El stock no puede ser negativo.", "Aviso", "aviso");
    return;
  }

  if (presentaciones.length === 0) {
    mostrarMensaje("Debes agregar al menos una presentación. Ejemplo: Unidad, precio 2, descuenta 1.", "Presentación requerida", "aviso");
    return;
  }

  const codigoRepetido = productos.find(function(p) {
    return p.codigo === codigo && p.id !== editandoId;
  });

  if (codigoRepetido) {
    mostrarMensaje("Ya existe un producto con ese código.", "Código repetido", "error");
    return;
  }

  const producto = {
    id: editandoId || Date.now().toString(),
    codigo: codigo,
    nombre: nombre,
    autor: autor,
    precioCompra: precioCompra,
    stock: stock,
    stockMinimo: stockMinimo,
    unidadBase: unidadBase,
    ubicacion: ubicacion,
    presentaciones: presentaciones
  };

  if (editandoId) {
    const index = productos.findIndex(function(p) {
      return p.id === editandoId;
    });

    if (index !== -1) {
      productos[index] = producto;
      mostrarMensaje("Producto actualizado correctamente.", "Listo", "exito");
    } else {
      mostrarMensaje("No se encontró el producto para editar.", "Error", "error");
      return;
    }
  } else {
    productos.push(producto);
    mostrarMensaje("Producto guardado correctamente.", "Listo", "exito");
  }

  guardarDatos();
  limpiarFormulario();
  mostrarProductos();
  actualizarResumen();
}

function mostrarProductos() {
  const lista = document.getElementById("listaProductos");
  const buscador = document.getElementById("buscador");
  if (!lista) return;

  const busqueda = buscador ? buscador.value.trim().toLowerCase() : "";
  lista.innerHTML = "";

  const filtrados = productos.filter(function(p) {
    const codigo = String(p.codigo || "").toLowerCase();
    const nombre = String(p.nombre || "").toLowerCase();
    const autor = String(p.autor || "").toLowerCase();
    const ubicacion = String(p.ubicacion || "").toLowerCase();
    const unidadBase = String(p.unidadBase || "").toLowerCase();
    const presentacionesTexto = (p.presentaciones || []).map(function(pr) {
      return pr.nombre + " " + pr.precio;
    }).join(" ").toLowerCase();

    return codigo.includes(busqueda) || nombre.includes(busqueda) || autor.includes(busqueda) || ubicacion.includes(busqueda) || unidadBase.includes(busqueda) || presentacionesTexto.includes(busqueda);
  });

  if (filtrados.length === 0) {
    lista.innerHTML = `<tr><td colspan="6">No se encontraron productos</td></tr>`;
    return;
  }

  filtrados.forEach(function(p) {
    const stock = Number(p.stock) || 0;
    const unidadBase = p.unidadBase || "unidad";

    let presentacionesTexto = '<div class="lista-presentaciones">';
    (p.presentaciones || []).forEach(function(pr) {
      presentacionesTexto += `${pr.nombre}: <strong>Q${Number(pr.precio).toFixed(2)}</strong><br>`;
    });
    presentacionesTexto += "</div>";

    const botones = `
      <button class="accion verde" onclick="abrirVentaModal('${p.codigo}')">Agregar</button>
      <button class="accion editar" onclick="editarProducto('${p.id}')">Editar</button>
      <button class="accion azul" onclick="abrirStockModal('${p.id}', 'entrada')">+ Stock</button>
      <button class="accion eliminar" onclick="eliminarProducto('${p.id}')">Eliminar</button>
    `;

    lista.innerHTML += `
      <tr>
        <td>${p.codigo || ""}</td>
        <td>${p.nombre || ""}</td>
        <td>${presentacionesTexto}</td>
        <td>${stock} ${unidadBase}</td>
        <td><strong>${p.ubicacion || "Sin ubicación"}</strong></td>
        <td>${botones}</td>
      </tr>
    `;
  });
}

function editarProducto(id) {
  const p = productos.find(function(producto) {
    return producto.id === id;
  });

  if (!p) {
    mostrarMensaje("Producto no encontrado.", "Error", "error");
    return;
  }

  mostrarApartado("productos");

  document.getElementById("editandoId").value = p.id || "";
  document.getElementById("codigo").value = p.codigo || "";
  document.getElementById("nombre").value = p.nombre || "";
  document.getElementById("autor").value = p.autor || "";
  document.getElementById("precioCompra").value = p.precioCompra || "";
  document.getElementById("stock").value = p.stock || "";
  document.getElementById("stockMinimo").value = p.stockMinimo || "";
  document.getElementById("unidadBase").value = p.unidadBase || "";
  document.getElementById("ubicacion").value = p.ubicacion || "";

  for (let i = 1; i <= 4; i++) {
    document.getElementById("presNombre" + i).value = "";
    document.getElementById("presPrecio" + i).value = "";
    document.getElementById("presDescuento" + i).value = "";
  }

  (p.presentaciones || []).forEach(function(pr, index) {
    const numero = index + 1;
    if (numero <= 4) {
      document.getElementById("presNombre" + numero).value = pr.nombre || "";
      document.getElementById("presPrecio" + numero).value = pr.precio || "";
      document.getElementById("presDescuento" + numero).value = pr.descuenta || "";
    }
  });

  window.scrollTo(0, 0);
}

function abrirStockModal(id, tipo) {
  pedirClaveAdmin(function() {
    const producto = productos.find(function(p) {
      return p.id === id;
    });

    if (!producto) {
      mostrarMensaje("Producto no encontrado.", "Error", "error");
      return;
    }

    productoStockSeleccionado = producto;
    tipoMovimientoStock = tipo;

    document.getElementById("stockCantidadInput").value = "";
    document.getElementById("stockModalTitulo").textContent = "Agregar stock";
    document.getElementById("stockModalTexto").textContent = "Producto: " + producto.nombre + ". Escribe cuánto stock quieres agregar.";
    document.getElementById("stockModal").style.display = "flex";
  });
}

function confirmarCambioStock() {
  if (!productoStockSeleccionado) return;

  const cantidad = Number(document.getElementById("stockCantidadInput").value);
  if (isNaN(cantidad) || cantidad <= 0) {
    mostrarMensaje("Cantidad no válida.", "Aviso", "aviso");
    return;
  }

  cambiarStock(productoStockSeleccionado, tipoMovimientoStock, cantidad);
}

function cerrarStockModal() {
  const modal = document.getElementById("stockModal");
  if (modal) modal.style.display = "none";
  productoStockSeleccionado = null;
  tipoMovimientoStock = "entrada";
}

function agregarStockMovimiento() {
  pedirClaveAdmin(function() {
    const codigo = obtenerValor("movCodigo");
    const cantidad = obtenerNumero("movCantidad");

    if (codigo === "" || cantidad <= 0) {
      mostrarMensaje("Escribe código y cantidad válida.", "Aviso", "aviso");
      return;
    }

    const producto = productos.find(function(p) {
      return p.codigo === codigo;
    });

    if (!producto) {
      mostrarMensaje("No se encontró un producto con ese código.", "Error", "error");
      return;
    }

    cambiarStock(producto, "entrada", cantidad);
    limpiarMovimientoInputs();
  });
}

function quitarStockMovimiento() {
  pedirClaveAdmin(function() {
    const codigo = obtenerValor("movCodigo");
    const cantidad = obtenerNumero("movCantidad");

    if (codigo === "" || cantidad <= 0) {
      mostrarMensaje("Escribe código y cantidad válida.", "Aviso", "aviso");
      return;
    }

    const producto = productos.find(function(p) {
      return p.codigo === codigo;
    });

    if (!producto) {
      mostrarMensaje("No se encontró un producto con ese código.", "Error", "error");
      return;
    }

    const ok = cambiarStock(producto, "salida", cantidad);
    if (ok) limpiarMovimientoInputs();
  });
}

function limpiarMovimientoInputs() {
  const codigo = document.getElementById("movCodigo");
  const cantidad = document.getElementById("movCantidad");
  if (codigo) codigo.value = "";
  if (cantidad) cantidad.value = "";
}

function cambiarStock(producto, tipo, cantidad) {
  const stockAnterior = Number(producto.stock) || 0;
  let stockNuevo = stockAnterior;
  let tipoTexto = "";

  if (tipo === "entrada") {
    stockNuevo = stockAnterior + cantidad;
    tipoTexto = "Entrada de stock";
  } else {
    if (cantidad > stockAnterior) {
      mostrarMensaje("No puedes quitar más stock del disponible.", "Stock insuficiente", "aviso");
      return false;
    }

    stockNuevo = stockAnterior - cantidad;
    tipoTexto = "Salida de stock";
  }

  producto.stock = stockNuevo;

  movimientos.push({
    fecha: new Date().toLocaleString(),
    codigo: producto.codigo,
    nombre: producto.nombre,
    tipo: tipoTexto,
    cantidad: tipo === "entrada" ? cantidad : -cantidad,
    stockAnterior: stockAnterior,
    stockNuevo: stockNuevo
  });

  guardarDatos();
  mostrarProductos();
  mostrarMovimientos();
  actualizarResumen();
  cerrarStockModal();

  mostrarMensaje("Stock actualizado. Nuevo stock: " + stockNuevo + " " + (producto.unidadBase || ""), "Stock actualizado", "exito");
  return true;
}

function eliminarProducto(id) {
  pedirClaveAdmin(function() {
    const producto = productos.find(function(p) {
      return p.id === id;
    });

    if (!producto) return;

    mostrarConfirmacion(
      "Eliminar producto",
      "¿Seguro que quieres eliminar el producto: " + producto.nombre + "?",
      function() {
        productos = productos.filter(function(p) {
          return p.id !== id;
        });

        guardarDatos();
        mostrarProductos();
        actualizarResumen();
        mostrarMensaje("Producto eliminado correctamente.", "Listo", "exito");
      }
    );
  });
}

function limpiarFormulario() {
  document.getElementById("editandoId").value = "";
  document.getElementById("codigo").value = "";
  document.getElementById("nombre").value = "";
  document.getElementById("autor").value = "";
  document.getElementById("precioCompra").value = "";
  document.getElementById("stock").value = "";
  document.getElementById("stockMinimo").value = "";
  document.getElementById("unidadBase").value = "";
  document.getElementById("ubicacion").value = "";

  for (let i = 1; i <= 4; i++) {
    document.getElementById("presNombre" + i).value = "";
    document.getElementById("presPrecio" + i).value = "";
    document.getElementById("presDescuento" + i).value = "";
  }
}

function abrirVentaModal(codigo) {
  const producto = productos.find(function(p) {
    return p.codigo === codigo;
  });

  if (!producto) {
    mostrarMensaje("Producto no encontrado.", "Error", "error");
    return;
  }

  if (!producto.presentaciones || producto.presentaciones.length === 0) {
    mostrarMensaje("Este producto no tiene presentaciones. Edita el producto y agrega una presentación como Unidad.", "Presentación requerida", "aviso");
    return;
  }

  productoSeleccionadoVenta = producto;

  const cantidadRapida = obtenerNumero("cantidadVenta");
  const cantidadInicial = cantidadRapida > 0 ? cantidadRapida : 1;

  document.getElementById("ventaProductoTitulo").textContent = producto.nombre;
  document.getElementById("ventaCantidadModal").value = cantidadInicial;

  const select = document.getElementById("ventaPresentacion");
  select.innerHTML = "";

  producto.presentaciones.forEach(function(pr, index) {
    const option = document.createElement("option");
    option.value = index;
    option.textContent = pr.nombre + " - Q" + Number(pr.precio).toFixed(2);
    select.appendChild(option);
  });

  document.getElementById("ventaModal").style.display = "flex";
}

function cerrarVentaModal() {
  const modal = document.getElementById("ventaModal");
  if (modal) modal.style.display = "none";
  productoSeleccionadoVenta = null;
}

function confirmarAgregarVenta() {
  if (!productoSeleccionadoVenta) {
    mostrarMensaje("No hay producto seleccionado.", "Error", "error");
    return;
  }

  const indice = Number(document.getElementById("ventaPresentacion").value);
  const cantidad = Number(document.getElementById("ventaCantidadModal").value);

  if (isNaN(cantidad) || cantidad <= 0) {
    mostrarMensaje("Cantidad no válida.", "Aviso", "aviso");
    return;
  }

  agregarItemAVenta(productoSeleccionadoVenta.codigo, cantidad, indice);
  cerrarVentaModal();

  document.getElementById("codigoVenta").value = "";
  document.getElementById("cantidadVenta").value = "";
}

function agregarAVenta() {
  const codigo = obtenerValor("codigoVenta");
  if (codigo === "") {
    mostrarMensaje("Escribe el código del producto.", "Aviso", "aviso");
    return;
  }

  abrirVentaModal(codigo);
}

function agregarItemAVenta(codigo, cantidad, indicePresentacion) {
  const producto = productos.find(function(p) {
    return p.codigo === codigo;
  });

  if (!producto) {
    mostrarMensaje("Producto no encontrado.", "Error", "error");
    return;
  }

  const presentacion = producto.presentaciones[indicePresentacion];
  if (!presentacion) {
    mostrarMensaje("Presentación no encontrada.", "Error", "error");
    return;
  }

  const precioUsado = Number(presentacion.precio) || 0;
  const descuentaUnidad = Number(presentacion.descuenta) || 0;
  const stockNecesario = cantidad * descuentaUnidad;

  const yaAgregado = ventaActual.find(function(item) {
    return item.codigo === codigo && item.presentacion === presentacion.nombre;
  });

  const stockYaEnVenta = ventaActual.reduce(function(total, item) {
    if (item.codigo === codigo) return total + Number(item.stockDescontar || 0);
    return total;
  }, 0);

  const stockDisponible = Number(producto.stock) || 0;

  if (stockDisponible < stockYaEnVenta + stockNecesario) {
    mostrarMensaje("No hay suficiente stock disponible.", "Stock insuficiente", "aviso");
    return;
  }

  const costoEstimado = (Number(producto.precioCompra) || 0) * stockNecesario;
  const subtotal = cantidad * precioUsado;
  const ganancia = subtotal - costoEstimado;

  if (yaAgregado) {
    yaAgregado.cantidad += cantidad;
    yaAgregado.stockDescontar += stockNecesario;
    yaAgregado.subtotal += subtotal;
    yaAgregado.ganancia += ganancia;
  } else {
    ventaActual.push({
      codigo: producto.codigo,
      nombre: producto.nombre,
      presentacion: presentacion.nombre,
      cantidad: cantidad,
      precioVenta: precioUsado,
      subtotal: subtotal,
      stockDescontar: stockNecesario,
      unidadBase: producto.unidadBase || "unidad",
      ganancia: ganancia
    });
  }

  mostrarVentaActual();
}

function mostrarVentaActual() {
  const lista = document.getElementById("listaVentaActual");
  const totalTexto = document.getElementById("totalVenta");
  const gananciaTexto = document.getElementById("gananciaVentaActual");

  if (!lista || !totalTexto || !gananciaTexto) return;

  lista.innerHTML = "";

  let total = 0;
  let ganancia = 0;

  if (ventaActual.length === 0) {
    lista.innerHTML = `<tr><td colspan="6">No hay productos en la venta</td></tr>`;
  }

  ventaActual.forEach(function(item, index) {
    total += Number(item.subtotal) || 0;
    ganancia += Number(item.ganancia) || 0;

    lista.innerHTML += `
      <tr>
        <td>${item.nombre}</td>
        <td>${item.presentacion}</td>
        <td>${item.cantidad}</td>
        <td>Q${Number(item.precioVenta).toFixed(2)}</td>
        <td>Q${Number(item.subtotal).toFixed(2)}</td>
        <td><button class="accion eliminar" onclick="quitarDeVenta(${index})">Quitar</button></td>
      </tr>
    `;
  });

  totalTexto.textContent = total.toFixed(2);
  gananciaTexto.textContent = ganancia.toFixed(2);
}

function quitarDeVenta(index) {
  ventaActual.splice(index, 1);
  mostrarVentaActual();
}

function limpiarVentaActual() {
  ventaActual = [];
  mostrarVentaActual();

  document.getElementById("codigoVenta").value = "";
  document.getElementById("cantidadVenta").value = "";
}

function calcularTotalVentaActual() {
  return ventaActual.reduce(function(total, item) {
    return total + (Number(item.subtotal) || 0);
  }, 0);
}

function finalizarVenta() {
  if (ventaActual.length === 0) {
    mostrarMensaje("No hay productos en la venta.", "Aviso", "aviso");
    return;
  }

  const total = calcularTotalVentaActual().toFixed(2);
  document.getElementById("confirmarVentaTotal").textContent = total;
  document.getElementById("confirmarVentaModal").style.display = "flex";
}

function cerrarConfirmarVenta() {
  const modal = document.getElementById("confirmarVentaModal");
  if (modal) modal.style.display = "none";
}

function confirmarFinalizarVenta() {
  cerrarConfirmarVenta();

  if (ventaActual.length === 0) {
    mostrarMensaje("No hay productos en la venta.", "Aviso", "aviso");
    return;
  }

  let totalVenta = 0;
  let gananciaVenta = 0;

  ventaActual.forEach(function(item) {
    const producto = productos.find(function(p) {
      return p.codigo === item.codigo;
    });

    if (producto) {
      producto.stock = (Number(producto.stock) || 0) - (Number(item.stockDescontar) || 0);
      totalVenta += Number(item.subtotal) || 0;
      gananciaVenta += Number(item.ganancia) || 0;
    }
  });

  const venta = {
    fecha: new Date().toLocaleString(),
    productos: ventaActual.map(function(item) {
      return {
        codigo: item.codigo,
        nombre: item.nombre,
        presentacion: item.presentacion,
        cantidad: item.cantidad,
        precioVenta: item.precioVenta,
        subtotal: item.subtotal,
        stockDescontar: item.stockDescontar,
        unidadBase: item.unidadBase,
        ganancia: item.ganancia
      };
    }),
    total: totalVenta,
    ganancia: gananciaVenta
  };

  ventas.push(venta);
  ventaActual = [];

  guardarDatos();
  mostrarVentaActual();
  mostrarProductos();
  mostrarVentas();
  actualizarResumen();

  mostrarMensaje("Venta finalizada correctamente. Total: Q" + totalVenta.toFixed(2), "Venta finalizada", "exito");
}

function mostrarVentas() {
  const lista = document.getElementById("listaVentas");
  if (!lista) return;

  lista.innerHTML = "";

  if (ventas.length === 0) {
    lista.innerHTML = `<tr><td colspan="7">No hay ventas registradas</td></tr>`;
    return;
  }

  ventas.slice().reverse().forEach(function(v) {
    if (v.productos && Array.isArray(v.productos)) {
      v.productos.forEach(function(item) {
        lista.innerHTML += `
          <tr>
            <td>${v.fecha}</td>
            <td>${item.codigo}</td>
            <td>${item.nombre}</td>
            <td>${item.presentacion}</td>
            <td>${item.cantidad}</td>
            <td>Q${Number(item.subtotal).toFixed(2)}</td>
            <td>Q${Number(item.ganancia || 0).toFixed(2)}</td>
          </tr>
        `;
      });

      lista.innerHTML += `
        <tr class="total-fila">
          <td colspan="5">Total de venta</td>
          <td>Q${Number(v.total).toFixed(2)}</td>
          <td>Q${Number(v.ganancia || 0).toFixed(2)}</td>
        </tr>
      `;
    }
  });
}

function borrarVentas() {
  pedirClaveAdmin(function() {
    mostrarConfirmacion("Borrar historial", "¿Seguro que quieres borrar todo el historial de ventas?", function() {
      ventas = [];
      guardarDatos();
      mostrarVentas();
      actualizarResumen();
      mostrarMensaje("Historial de ventas eliminado.", "Listo", "exito");
    });
  });
}


function mostrarMovimientos() {
  const lista = document.getElementById("listaMovimientos");
  if (!lista) return;

  lista.innerHTML = "";

  if (movimientos.length === 0) {
    lista.innerHTML = `<tr><td colspan="7">No hay movimientos de stock</td></tr>`;
    return;
  }

  movimientos.slice().reverse().forEach(function(m) {
    lista.innerHTML += `
      <tr>
        <td>${m.fecha}</td>
        <td>${m.codigo}</td>
        <td>${m.nombre}</td>
        <td>${m.tipo || "Movimiento"}</td>
        <td>${m.cantidad}</td>
        <td>${m.stockAnterior}</td>
        <td>${m.stockNuevo}</td>
      </tr>
    `;
  });
}

function borrarMovimientos() {
  pedirClaveAdmin(function() {
    mostrarConfirmacion(
      "Borrar movimientos",
      "¿Seguro que quieres borrar todo el historial de movimientos de stock?",
      function() {
        movimientos = [];

        guardarDatos();
        mostrarMovimientos();
        actualizarResumen();

        mostrarMensaje("Historial de movimientos eliminado.", "Listo", "exito");
      }
    );
  });
}

function descargarInventario() {
  if (productos.length === 0) {
    mostrarMensaje("No hay productos para descargar.", "Aviso", "aviso");
    return;
  }

  let csv = "Codigo,Producto,Marca,Costo Unidad Base,Stock,Stock Minimo,Unidad Base,Ubicacion,Presentaciones\n";

  productos.forEach(function(p) {
    const presentacionesTexto = (p.presentaciones || []).map(function(pr) {
      return `${pr.nombre}: Q${pr.precio} descuenta ${pr.descuenta}`;
    }).join(" | ");

    csv += `"${p.codigo}","${p.nombre}","${p.autor}",${p.precioCompra},${p.stock},${p.stockMinimo},"${p.unidadBase}","${p.ubicacion}","${presentacionesTexto}"\n`;
  });

  descargarCSV(csv, "inventario_libreria_osita.csv");
}

function descargarVentas() {
  if (ventas.length === 0) {
    mostrarMensaje("No hay ventas para descargar.", "Aviso", "aviso");
    return;
  }

  let csv = "Fecha,Codigo,Producto,Presentacion,Cantidad,Total,Ganancia\n";

  ventas.forEach(function(v) {
    if (v.productos && Array.isArray(v.productos)) {
      v.productos.forEach(function(item) {
        csv += `"${v.fecha}","${item.codigo}","${item.nombre}","${item.presentacion}",${item.cantidad},${item.subtotal},${item.ganancia || 0}\n`;
      });

      csv += `"${v.fecha}","TOTAL DE VENTA","","","",${v.total},${v.ganancia || 0}\n`;
    }
  });

  descargarCSV(csv, "ventas_libreria_osita.csv");
}

function descargarMovimientos() {
  if (movimientos.length === 0) {
    mostrarMensaje("No hay movimientos para descargar.", "Aviso", "aviso");
    return;
  }

  let csv = "Fecha,Codigo,Producto,Tipo,Cantidad,Stock Anterior,Stock Nuevo\n";

  movimientos.forEach(function(m) {
    csv += `"${m.fecha}","${m.codigo}","${m.nombre}","${m.tipo || "Movimiento"}",${m.cantidad},${m.stockAnterior},${m.stockNuevo}\n`;
  });

  descargarCSV(csv, "movimientos_libreria_osita.csv");
}

function descargarCSV(contenido, nombreArchivo) {
  const archivo = new Blob([contenido], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(archivo);

  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombreArchivo;
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);

  URL.revokeObjectURL(url);
}

function crearRespaldo() {
  const respaldo = {
    fecha: new Date().toLocaleString(),
    productos: productos,
    ventas: ventas,
    movimientos: movimientos
  };

  const archivo = new Blob([JSON.stringify(respaldo, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(archivo);

  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = "respaldo_libreria_osita.json";
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);

  URL.revokeObjectURL(url);

  mostrarMensaje("Respaldo creado correctamente.", "Listo", "exito");
}

function restaurarRespaldo() {
  pedirClaveAdmin(function() {
    restaurarRespaldoAdmin();
  });
}

function restaurarRespaldoAdmin() {
  const archivoInput = document.getElementById("archivoRespaldo");
  const archivo = archivoInput.files[0];

  if (!archivo) {
    mostrarMensaje("Selecciona un archivo de respaldo.", "Aviso", "aviso");
    return;
  }

  mostrarConfirmacion("Restaurar respaldo", "Esto reemplazará los datos actuales. ¿Deseas continuar?", function() {
    leerArchivoRespaldo(archivo);
  });
}

function leerArchivoRespaldo(archivo) {
  const lector = new FileReader();

  lector.onload = function(evento) {
    try {
      const datos = JSON.parse(evento.target.result);

      if (!Array.isArray(datos.productos) || !Array.isArray(datos.ventas)) {
        mostrarMensaje("El archivo no es un respaldo válido.", "Error", "error");
        return;
      }

      productos = normalizarProductos(datos.productos);
      ventas = datos.ventas || [];
      movimientos = datos.movimientos || [];
      ventaActual = [];

      guardarDatos();
      mostrarProductos();
      mostrarVentas();
      mostrarVentaActual();
      mostrarMovimientos();
      actualizarResumen();

      mostrarMensaje("Respaldo restaurado correctamente.", "Listo", "exito");
    } catch (error) {
      mostrarMensaje("Error al leer el archivo de respaldo.", "Error", "error");
    }
  };

  lector.readAsText(archivo);
}

function actualizarResumen() {
  const totalProductos = document.getElementById("totalProductos");
  const totalStockBajo = document.getElementById("totalStockBajo");
  const ventasHoyElemento = document.getElementById("ventasHoy");
  const totalVendidoHoyElemento = document.getElementById("totalVendidoHoy");
  const gananciaHoyElemento = document.getElementById("gananciaHoy");

  const corteCantidadVentas = document.getElementById("corteCantidadVentas");
  const corteTotalVendido = document.getElementById("corteTotalVendido");
  const corteGanancia = document.getElementById("corteGanancia");
  const productoMasVendido = document.getElementById("productoMasVendido");
  const listaStockBajo = document.getElementById("listaStockBajo");

  const productosStockBajo = productos.filter(function(p) {
    return (Number(p.stock) || 0) <= (Number(p.stockMinimo) || 0);
  });

  const ventasHoy = obtenerVentasDeHoy();

  const vendidoHoy = ventasHoy.reduce(function(total, venta) {
    return total + (Number(venta.total) || 0);
  }, 0);

  const gananciaDelDia = ventasHoy.reduce(function(total, venta) {
    return total + (Number(venta.ganancia) || 0);
  }, 0);

  if (totalProductos) totalProductos.textContent = productos.length;
  if (totalStockBajo) totalStockBajo.textContent = productosStockBajo.length;

  if (ventasHoyElemento) ventasHoyElemento.textContent = ventasHoy.length;
  if (totalVendidoHoyElemento) totalVendidoHoyElemento.textContent = vendidoHoy.toFixed(2);
  if (gananciaHoyElemento) gananciaHoyElemento.textContent = gananciaDelDia.toFixed(2);

  if (corteCantidadVentas) corteCantidadVentas.textContent = ventasHoy.length;
  if (corteTotalVendido) corteTotalVendido.textContent = vendidoHoy.toFixed(2);
  if (corteGanancia) corteGanancia.textContent = gananciaDelDia.toFixed(2);
  if (productoMasVendido) {
  productoMasVendido.textContent = ventasHoy.length === 0 ? "Ninguno" : obtenerProductoMasVendido();
}

  if (listaStockBajo) {
    listaStockBajo.innerHTML = "";

    if (productosStockBajo.length === 0) {
      listaStockBajo.innerHTML = `<tr><td colspan="5">No hay productos con stock bajo</td></tr>`;
    } else {
      productosStockBajo.forEach(function(p) {
        listaStockBajo.innerHTML += `
          <tr>
            <td>${p.codigo}</td>
            <td>${p.nombre}</td>
            <td>${p.marca || ""}</td>
            <td>${p.stock}</td>
            <td>${p.ubicacion || ""}</td>
          </tr>
        `;
      });
    }
  }
}

function obtenerProductoMasVendido() {
  const ventasHoy = obtenerVentasDeHoy();
  const conteo = {};

  ventasHoy.forEach(function(venta) {
    if (venta.productos && Array.isArray(venta.productos)) {
      venta.productos.forEach(function(item) {
        const clave = item.codigo + " - " + item.nombre;

        if (!conteo[clave]) {
          conteo[clave] = 0;
        }

        conteo[clave] += Number(item.cantidad) || 0;
      });
    }
  });

  let mejorProducto = "Ninguno";
  let mayor = 0;

  Object.keys(conteo).forEach(function(nombre) {
    if (conteo[nombre] > mayor) {
      mayor = conteo[nombre];
      mejorProducto = nombre + " (" + mayor + ")";
    }
  });

  return mejorProducto;
}

guardarDatos();
mostrarProductos();
mostrarVentas();
mostrarVentaActual();
mostrarMovimientos();
actualizarResumen();

function probarCorteDia() {
  const ventasDelDia = obtenerVentasDeHoy();

  if (ventasDelDia.length === 0) {
    actualizarResumen();
    mostrarMensaje("No hay ventas registradas hoy para hacer corte.", "Aviso", "aviso");
    return;
  }

  mostrarConfirmacion(
    "Finalizar corte del día",
    "¿Seguro que deseas finalizar el corte? Se guardará el historial y se intentará generar el PDF.",
    function() {
      const totalVendido = ventasDelDia.reduce(function(total, venta) {
        return total + (Number(venta.total) || 0);
      }, 0);

      const gananciaTotal = ventasDelDia.reduce(function(total, venta) {
        return total + (Number(venta.ganancia) || 0);
      }, 0);

      const corte = {
        id: Date.now().toString(),
        fechaCompleta: new Date().toLocaleString(),
        cantidadVentas: ventasDelDia.length,
        totalVendido: totalVendido,
        ganancia: gananciaTotal,
        ventas: ventasDelDia
      };

      // 1. Guardar corte
      cortes.push(corte);

      // 2. Cerrar el periodo del corte ANTES del PDF
      fechaUltimoCorte = new Date().toISOString();
      localStorage.setItem("fechaUltimoCorte", fechaUltimoCorte);

      // 3. Guardar datos y limpiar pantalla
      guardarDatos();
      mostrarCortes();
      actualizarResumen();

      // 4. Guardar respaldo interno sin abrir JSON en iPad
      crearRespaldoAutomaticoCorte(corte, false);

      // 5. Intentar generar PDF sin bloquear el cierre del corte
      try {
        generarPDFCorte(corte);
      } catch (error) {
        mostrarMensaje(
          "El corte fue guardado, pero el iPad no pudo abrir el PDF. Puedes revisar el historial de cortes.",
          "PDF no generado",
          "aviso"
        );
        return;
      }

      mostrarMensaje(
        "Corte guardado correctamente. Ventas: " + ventasDelDia.length + " | Total: Q" + totalVendido.toFixed(2),
        "Corte guardado",
        "exito"
      );
    }
  );
}

function convertirFechaVenta(fechaTexto) {
  if (!fechaTexto) return null;

  const partes = String(fechaTexto).split(",");
  const fecha = partes[0].trim();
  const hora = partes[1] ? partes[1].trim() : "00:00:00";

  const fechaPartes = fecha.split("/");
  const horaPartes = hora.split(":");

  const dia = Number(fechaPartes[0]);
  const mes = Number(fechaPartes[1]) - 1;
  const anio = Number(fechaPartes[2]);

  const horas = Number(horaPartes[0]) || 0;
  const minutos = Number(horaPartes[1]) || 0;
  const segundos = Number(horaPartes[2]) || 0;

  return new Date(anio, mes, dia, horas, minutos, segundos);
}

function obtenerVentasDeHoy() {
  const fechaHoy = new Date().toLocaleDateString();

  return ventas.filter(function(venta) {
    const esDeHoy = String(venta.fecha || "").includes(fechaHoy);

    if (!esDeHoy) {
      return false;
    }

    if (!fechaUltimoCorte) {
      return true;
    }

    const fechaVenta = convertirFechaVenta(venta.fecha);
    const fechaCorte = new Date(fechaUltimoCorte);

    if (!fechaVenta || isNaN(fechaVenta.getTime()) || isNaN(fechaCorte.getTime())) {
      return true;
    }

    return fechaVenta.getTime() > fechaCorte.getTime();
  });
}

  function mostrarCortes() {
  const lista = document.getElementById("listaCortes");

  if (!lista) return;

  lista.innerHTML = "";

  if (!cortes || cortes.length === 0) {
    lista.innerHTML = `
      <tr>
        <td colspan="4">No hay cortes registrados</td>
      </tr>
    `;
    return;
  }

  cortes.slice().reverse().forEach(function(corte) {
    lista.innerHTML += `
      <tr>
        <td>${corte.fechaCompleta}</td>
        <td>${corte.cantidadVentas}</td>
        <td>Q${Number(corte.totalVendido || 0).toFixed(2)}</td>
        <td>Q${Number(corte.ganancia || 0).toFixed(2)}</td>
      </tr>
    `;
  });
}

function generarPDFCorte(corte) {
  if (!window.jspdf || !window.jspdf.jsPDF) {
    mostrarMensaje("No se pudo cargar el generador de PDF.", "Error", "error");
    return;
  }

  const jsPDF = window.jspdf.jsPDF;

  function dibujarPDF(logoDataUrl) {
    const doc = new jsPDF();

    const cafe = [122, 74, 36];
    const cafeOscuro = [90, 50, 20];
    const crema = [248, 239, 227];
    const gris = [90, 90, 90];

    const margen = 15;
    let y = 15;

    doc.setFillColor(cafe[0], cafe[1], cafe[2]);
    doc.rect(0, 0, 210, 35, "F");

    if (logoDataUrl) {
      try {
        doc.addImage(logoDataUrl, "PNG", 182, 6, 18, 18);
      } catch (e) {}
    }

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("Librería Osita", margen, 15);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Pequeños detalles, grandes ideas", margen, 22);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("CORTE DE CAJA", 155, 15, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(corte.fechaCompleta, 155, 22, { align: "right" });

    y = 48;

    doc.setTextColor(cafeOscuro[0], cafeOscuro[1], cafeOscuro[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Resumen del corte del día", margen, y);

    y += 8;

    const cardY = y;
    const cardH = 25;
    const cardW = 42;
    const gap = 4;

    function tarjeta(x, titulo, valor) {
      doc.setFillColor(crema[0], crema[1], crema[2]);
      doc.roundedRect(x, cardY, cardW, cardH, 3, 3, "F");

      doc.setTextColor(gris[0], gris[1], gris[2]);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text(titulo, x + cardW / 2, cardY + 8, { align: "center" });

      doc.setTextColor(cafeOscuro[0], cafeOscuro[1], cafeOscuro[2]);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text(valor, x + cardW / 2, cardY + 18, { align: "center" });
    }

    tarjeta(margen, "VENTAS", String(corte.cantidadVentas));
    tarjeta(margen + cardW + gap, "TOTAL VENDIDO", "Q" + Number(corte.totalVendido || 0).toFixed(2));
    tarjeta(margen + (cardW + gap) * 2, "GANANCIA", "Q" + Number(corte.ganancia || 0).toFixed(2));
    tarjeta(margen + (cardW + gap) * 3, "FECHA", String(corte.fechaCompleta).split(",")[0]);

    y += 42;

    doc.setTextColor(cafeOscuro[0], cafeOscuro[1], cafeOscuro[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("Detalle de ventas incluidas", margen, y);

    y += 8;

    doc.setFillColor(cafe[0], cafe[1], cafe[2]);
    doc.rect(margen, y, 180, 9, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("Fecha", margen + 2, y + 6);
    doc.text("Productos", margen + 47, y + 6);
    doc.text("Total", margen + 130, y + 6);
    doc.text("Ganancia", margen + 158, y + 6);

    y += 9;

    doc.setTextColor(30, 30, 30);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);

    const ventasDelCorte = corte.ventas || [];

    if (ventasDelCorte.length === 0) {
      doc.text("No hay detalle disponible.", margen + 2, y + 6);
      y += 8;
    } else {
      ventasDelCorte.forEach(function(venta, index) {
        if (y > 265) {
          doc.addPage();
          y = 20;
        }

        if (index % 2 === 0) {
          doc.setFillColor(250, 246, 240);
          doc.rect(margen, y, 180, 8, "F");
        }

        let productosTexto = "";

        if (venta.productos && Array.isArray(venta.productos)) {
          productosTexto = venta.productos.map(function(item) {
            return item.nombre + " x" + item.cantidad;
          }).join(", ");
        } else {
          productosTexto = "Venta";
        }

        if (productosTexto.length > 45) {
          productosTexto = productosTexto.substring(0, 45) + "...";
        }

        doc.text(String(venta.fecha || "").substring(0, 20), margen + 2, y + 6);
        doc.text(productosTexto, margen + 47, y + 6);
        doc.text("Q" + Number(venta.total || 0).toFixed(2), margen + 130, y + 6);
        doc.text("Q" + Number(venta.ganancia || 0).toFixed(2), margen + 158, y + 6);

        y += 8;
      });
    }

    y += 10;

    if (y > 250) {
      doc.addPage();
      y = 20;
    }

    doc.setFillColor(crema[0], crema[1], crema[2]);
    doc.roundedRect(margen, y, 180, 28, 3, 3, "F");

    y += 10;
    doc.setTextColor(cafeOscuro[0], cafeOscuro[1], cafeOscuro[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Resumen final", margen + 5, y);

    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Total vendido: Q" + Number(corte.totalVendido || 0).toFixed(2), margen + 5, y);

    y += 7;
    doc.text("Ganancia estimada: Q" + Number(corte.ganancia || 0).toFixed(2), margen + 5, y);

    doc.setFillColor(cafe[0], cafe[1], cafe[2]);
    doc.rect(0, 285, 210, 12, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text("Documento generado automáticamente por el sistema de Librería Osita.", 105, 292, { align: "center" });

    const fechaArchivo = corte.fechaCompleta
      .replaceAll("/", "-")
      .replaceAll(":", "-")
      .replaceAll(",", "")
      .replaceAll(" ", "_");

    const nombrePDF = "corte_libreria_osita_" + fechaArchivo + ".pdf";

    const esIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

    if (esIOS) {
      const pdfData = doc.output("datauristring");

      const ventana = window.open();
      if (ventana) {
        ventana.document.write(`
          <html>
            <head>
              <title>${nombrePDF}</title>
              <style>
                body { margin: 0; }
                iframe { width: 100%; height: 100vh; border: none; }
              </style>
            </head>
            <body>
              <iframe src="${pdfData}"></iframe>
            </body>
          </html>
        `);
      } else {
        window.location.href = pdfData;
      }
    } else {
      doc.save(nombrePDF);
    }
  }

dibujarPDF(null);
}

function crearRespaldoAutomaticoCorte(corte, descargar) {
  const respaldo = {
    fecha: new Date().toLocaleString(),
    motivo: "Respaldo automático generado al finalizar corte",
    corte: corte,
    productos: productos,
    ventas: ventas,
    movimientos: movimientos,
    cortes: cortes
  };

  localStorage.setItem("ultimoRespaldoAutomatico", JSON.stringify(respaldo));

  if (descargar !== true) {
    return;
  }

  const contenido = JSON.stringify(respaldo, null, 2);
  const enlace = document.createElement("a");

  enlace.href = "data:application/json;charset=utf-8," + encodeURIComponent(contenido);
  enlace.download = "respaldo_automatico_libreria_osita.json";

  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
}

function borrarCortes() {
  pedirClaveAdmin(function() {
    mostrarConfirmacion(
      "Borrar historial de cortes",
      "¿Seguro que quieres borrar todo el historial de cortes?",
      function() {
        cortes = [];
        guardarDatos();
        mostrarCortes();

        mostrarMensaje("Historial de cortes eliminado correctamente.", "Listo", "exito");
      }
    );
  });
}
