let productos = cargarLocalStorage("productos");
let ventas = cargarLocalStorage("ventas");
let movimientos = cargarLocalStorage("movimientos");
let cortes = cargarLocalStorage("cortes");
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
  movimientos: movimientos,
  cortes: cortes
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
      cortes = datos.cortes || [];
      ventaActual = [];

      guardarDatos();
      mostrarProductos();
      mostrarVentas();
      mostrarVentaActual();
      mostrarMovimientos();
      mostrarCortes();
      actualizarResumen();

      mostrarMensaje("Respaldo restaurado correctamente.", "Listo", "exito");
    } catch (error) {
      mostrarMensaje("Error al leer el archivo de respaldo.", "Error", "error");
    }
  };

  lector.readAsText(archivo);
}

function obtenerVentasDeHoy() {
  const fechaHoy = new Date().toLocaleDateString();

  return ventas.filter(function(v) {
    return String(v.fecha || "").includes(fechaHoy);
  });
}

function obtenerDetalleProductosVendidos(ventasDelDia) {
  const detalle = [];

  ventasDelDia.forEach(function(venta) {
    if (venta.productos && Array.isArray(venta.productos)) {
      venta.productos.forEach(function(item) {
        detalle.push({
          codigo: item.codigo,
          nombre: item.nombre,
          presentacion: item.presentacion,
          cantidad: Number(item.cantidad) || 0,
          subtotal: Number(item.subtotal) || 0,
          ganancia: Number(item.ganancia) || 0
        });
      });
    }
  });

  return detalle;
}

function obtenerProductoMasVendidoDelDia(ventasDelDia) {
  const conteo = {};

  ventasDelDia.forEach(function(venta) {
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

function finalizarCorteDia() {
  pedirClaveAdmin(function() {
    const ventasDelDia = obtenerVentasDeHoy();

    if (ventasDelDia.length === 0) {
      mostrarMensaje("No hay ventas registradas hoy para hacer corte.", "Aviso", "aviso");
      return;
    }

    mostrarConfirmacion(
      "Finalizar corte del día",
      "Se generará el PDF del corte y un respaldo automático. ¿Deseas continuar?",
      function() {
        crearCorteDia(ventasDelDia);
      }
    );
  });
}

function crearCorteDia(ventasDelDia) {
  const fecha = new Date();
  const detalle = obtenerDetalleProductosVendidos(ventasDelDia);

  const totalVendido = ventasDelDia.reduce(function(total, venta) {
    return total + (Number(venta.total) || 0);
  }, 0);

  const gananciaTotal = ventasDelDia.reduce(function(total, venta) {
    return total + (Number(venta.ganancia) || 0);
  }, 0);

  const corte = {
    id: Date.now().toString(),
    fecha: fecha.toLocaleDateString(),
    hora: fecha.toLocaleTimeString(),
    fechaCompleta: fecha.toLocaleString(),
    cantidadVentas: ventasDelDia.length,
    totalVendido: totalVendido,
    ganancia: gananciaTotal,
    productoMasVendido: obtenerProductoMasVendidoDelDia(ventasDelDia),
    detalle: detalle
  };

  cortes.push(corte);
  guardarDatos();

  generarPDFCorte(corte);
  crearRespaldoAutomaticoCorte(corte);

  mostrarCortes();
  actualizarResumen();

  mostrarMensaje(
    "Corte finalizado correctamente. Se descargó el PDF y el respaldo.",
    "Corte finalizado",
    "exito"
  );
}

function generarPDFCorte(corte) {
  if (!window.jspdf || !window.jspdf.jsPDF) {
    mostrarMensaje("No se pudo cargar la librería para generar PDF.", "Error", "error");
    return;
  }

  const jsPDF = window.jspdf.jsPDF;
  const doc = new jsPDF();

  let y = 15;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Librería Osita", 105, y, { align: "center" });

  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("Pequeños detalles, grandes ideas", 105, y, { align: "center" });

  y += 14;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("CORTE DE CAJA DEL DÍA", 105, y, { align: "center" });

  y += 12;
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");

  doc.text("Fecha: " + corte.fecha, 15, y);
  doc.text("Hora: " + corte.hora, 120, y);

  y += 8;
  doc.text("Cantidad de ventas: " + corte.cantidadVentas, 15, y);
  doc.text("Producto más vendido: " + corte.productoMasVendido, 80, y);

  y += 8;
  doc.setFont("helvetica", "bold");
  doc.text("Total vendido: Q" + Number(corte.totalVendido).toFixed(2), 15, y);
  doc.text("Ganancia estimada: Q" + Number(corte.ganancia).toFixed(2), 100, y);

  y += 12;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Detalle de productos vendidos", 15, y);

  y += 8;
  doc.setFillColor(122, 74, 36);
  doc.setTextColor(255, 255, 255);
  doc.rect(15, y - 5, 180, 8, "F");

  doc.setFontSize(9);
  doc.text("Código", 17, y);
  doc.text("Producto", 40, y);
  doc.text("Presentación", 95, y);
  doc.text("Cant.", 130, y);
  doc.text("Total", 148, y);
  doc.text("Ganancia", 170, y);

  y += 6;
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");

  if (corte.detalle.length === 0) {
    doc.text("No hay detalle de productos.", 15, y);
  } else {
    corte.detalle.forEach(function(item) {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }

      const nombreCorto = String(item.nombre || "").substring(0, 28);
      const presCorta = String(item.presentacion || "").substring(0, 18);

      doc.text(String(item.codigo || ""), 17, y);
      doc.text(nombreCorto, 40, y);
      doc.text(presCorta, 95, y);
      doc.text(String(item.cantidad), 132, y);
      doc.text("Q" + Number(item.subtotal).toFixed(2), 148, y);
      doc.text("Q" + Number(item.ganancia).toFixed(2), 170, y);

      y += 7;
    });
  }

  y += 10;

  if (y > 255) {
    doc.addPage();
    y = 20;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("RESUMEN FINAL", 15, y);

  y += 9;
  doc.setFontSize(12);
  doc.text("Total vendido: Q" + Number(corte.totalVendido).toFixed(2), 15, y);

  y += 8;
  doc.text("Ganancia estimada: Q" + Number(corte.ganancia).toFixed(2), 15, y);

  y += 15;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Corte generado automáticamente por el sistema de Librería Osita.", 15, y);

  const nombreArchivo = "corte_libreria_osita_" + corte.fecha.replaceAll("/", "-") + ".pdf";
  doc.save(nombreArchivo);
}

function crearRespaldoAutomaticoCorte(corte) {
  const respaldo = {
    fecha: new Date().toLocaleString(),
    motivo: "Respaldo automático generado al finalizar corte",
    corte: corte,
    productos: productos,
    ventas: ventas,
    movimientos: movimientos,
    cortes: cortes
  };

  const archivo = new Blob([JSON.stringify(respaldo, null, 2)], {
    type: "application/json"
  });

  const url = URL.createObjectURL(archivo);

  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = "respaldo_automatico_libreria_osita.json";
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);

  URL.revokeObjectURL(url);
}

function mostrarCortes() {
  const lista = document.getElementById("listaCortes");

  if (!lista) return;

  lista.innerHTML = "";

  if (!cortes || cortes.length === 0) {
    lista.innerHTML = `
      <tr>
        <td colspan="5">No hay cortes registrados</td>
      </tr>
    `;
    return;
  }

  cortes.slice().reverse().forEach(function(corte) {
    lista.innerHTML += `
      <tr>
        <td>${corte.fechaCompleta || corte.fecha}</td>
        <td>${corte.cantidadVentas}</td>
        <td>Q${Number(corte.totalVendido || 0).toFixed(2)}</td>
        <td>Q${Number(corte.ganancia || 0).toFixed(2)}</td>
        <td>${corte.productoMasVendido || "Ninguno"}</td>
      </tr>
    `;
  });
}

function descargarCortesCSV() {
  if (!cortes || cortes.length === 0) {
    mostrarMensaje("No hay cortes para descargar.", "Aviso", "aviso");
    return;
  }

  let csv = "Fecha,Ventas,Total Vendido,Ganancia,Producto Mas Vendido\n";

  cortes.forEach(function(corte) {
    csv += `"${corte.fechaCompleta || corte.fecha}",${corte.cantidadVentas},${corte.totalVendido},${corte.ganancia},"${corte.productoMasVendido}"\n`;
  });

  descargarCSV(csv, "cortes_libreria_osita.csv");
}

function borrarCortes() {
  pedirClaveAdmin(function() {
    mostrarConfirmacion(
      "Borrar cortes",
      "¿Seguro que quieres borrar todo el historial de cortes?",
      function() {
        cortes = [];
        guardarDatos();
        mostrarCortes();

        mostrarMensaje("Historial de cortes eliminado.", "Listo", "exito");
      }
    );
  });
}

function actualizarResumen() {
  const totalProductos = document.getElementById("totalProductos");
  const totalStockBajo = document.getElementById("totalStockBajo");
  const ventasHoy = document.getElementById("ventasHoy");
  const totalVendidoHoy = document.getElementById("totalVendidoHoy");
  const gananciaHoy = document.getElementById("gananciaHoy");
  const corteCantidadVentas = document.getElementById("corteCantidadVentas");
  const corteTotalVendido = document.getElementById("corteTotalVendido");
  const corteGanancia = document.getElementById("corteGanancia");
  const productoMasVendido = document.getElementById("productoMasVendido");
  const listaStockBajo = document.getElementById("listaStockBajo");

  const productosStockBajo = productos.filter(function(p) {
    return (Number(p.stock) || 0) <= (Number(p.stockMinimo) || 0);
  });

  const fechaHoy = new Date().toLocaleDateString();
  const ventasDeHoy = ventas.filter(function(v) {
    return String(v.fecha || "").includes(fechaHoy);
  });

  const vendidoHoy = ventasDeHoy.reduce(function(total, venta) {
    return total + (Number(venta.total) || 0);
  }, 0);

  const gananciaDelDia = ventasDeHoy.reduce(function(total, venta) {
    return total + (Number(venta.ganancia) || 0);
  }, 0);

  if (totalProductos) totalProductos.textContent = productos.length;
  if (totalStockBajo) totalStockBajo.textContent = productosStockBajo.length;
  if (ventasHoy) ventasHoy.textContent = ventasDeHoy.length;
  if (totalVendidoHoy) totalVendidoHoy.textContent = vendidoHoy.toFixed(2);
  if (gananciaHoy) gananciaHoy.textContent = gananciaDelDia.toFixed(2);
  if (corteCantidadVentas) corteCantidadVentas.textContent = ventasDeHoy.length;
  if (corteTotalVendido) corteTotalVendido.textContent = vendidoHoy.toFixed(2);
  if (corteGanancia) corteGanancia.textContent = gananciaDelDia.toFixed(2);
  if (productoMasVendido) productoMasVendido.textContent = obtenerProductoMasVendido();

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
            <td>${p.stock} ${p.unidadBase || ""}</td>
            <td>${p.stockMinimo} ${p.unidadBase || ""}</td>
            <td>${p.ubicacion || "Sin ubicación"}</td>
          </tr>
        `;
      });
    }
  }
}

function obtenerProductoMasVendido() {
  const conteo = {};

  ventas.forEach(function(v) {
    if (v.productos && Array.isArray(v.productos)) {
      v.productos.forEach(function(item) {
        const clave = item.codigo + " - " + item.nombre;
        if (!conteo[clave]) conteo[clave] = 0;
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
mostrarCortes();
actualizarResumen();
