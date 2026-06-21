let productos = cargarLocalStorage("productos");
let ventas = cargarLocalStorage("ventas");
let movimientos = cargarLocalStorage("movimientos");
let ventaActual = [];
let productoSeleccionadoVenta = null;

const CLAVE_ADMIN = "Maplewood78Q";

productos = normalizarProductos(productos);
guardarDatos();

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
        p.presentaciones = [
          {
            nombre: "Unidad",
            precio: precio,
            descuenta: 1
          }
        ];
      } else {
        p.presentaciones = [];
      }
    }

    if (!p.unidadBase) {
      p.unidadBase = "unidad";
    }

    if (p.stockMinimo === undefined) {
      p.stockMinimo = 0;
    }

    return p;
  });
}

function guardarDatos() {
  localStorage.setItem("productos", JSON.stringify(productos));
  localStorage.setItem("ventas", JSON.stringify(ventas));
  localStorage.setItem("movimientos", JSON.stringify(movimientos));
  actualizarResumen();
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
    alert(texto);
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
  document.getElementById("mensajeModal").style.display = "none";
}

function pedirClaveAdmin() {
  const clave = prompt("Ingresa la contraseña de administrador:");

  if (clave === null) {
    return false;
  }

  if (clave !== CLAVE_ADMIN) {
    mostrarMensaje("Contraseña incorrecta.", "Error", "error");
    return false;
  }

  return true;
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

  document.getElementById(nombre).classList.add("activo-apartado");
  document.getElementById("btn-" + nombre).classList.add("activo");

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
      presentaciones.push({
        nombre: nombre,
        precio: precio,
        descuenta: descuenta
      });
    }
  }

  return presentaciones;
}

function guardarProducto() {
  if (!pedirClaveAdmin()) {
    return;
  }

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

    return (
      codigo.includes(busqueda) ||
      nombre.includes(busqueda) ||
      autor.includes(busqueda) ||
      ubicacion.includes(busqueda) ||
      unidadBase.includes(busqueda) ||
      presentacionesTexto.includes(busqueda)
    );
  });

  if (filtrados.length === 0) {
    lista.innerHTML = `
      <tr>
        <td colspan="6">No se encontraron productos</td>
      </tr>
    `;
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
      <button class="accion azul" onclick="agregarStock('${p.id}')">Stock</button>
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

function agregarStock(id) {
  if (!pedirClaveAdmin()) {
    return;
  }

  const producto = productos.find(function(p) {
    return p.id === id;
  });

  if (!producto) {
    mostrarMensaje("Producto no encontrado.", "Error", "error");
    return;
  }

  const cantidad = Number(prompt("¿Cuánto quieres agregar al stock base?"));

  if (isNaN(cantidad) || cantidad <= 0) {
    mostrarMensaje("Cantidad no válida.", "Aviso", "aviso");
    return;
  }

  const stockAnterior = Number(producto.stock) || 0;
  const stockNuevo = stockAnterior + cantidad;

  producto.stock = stockNuevo;

  movimientos.push({
    fecha: new Date().toLocaleString(),
    codigo: producto.codigo,
    nombre: producto.nombre,
    cantidad: cantidad,
    stockAnterior: stockAnterior,
    stockNuevo: stockNuevo
  });

  guardarDatos();
  mostrarProductos();
  mostrarMovimientos();

  mostrarMensaje("Stock actualizado. Nuevo stock: " + stockNuevo + " " + (producto.unidadBase || ""), "Stock actualizado", "exito");
}

function eliminarProducto(id) {
  if (!pedirClaveAdmin()) {
    return;
  }

  const confirmar = confirm("¿Seguro que quieres eliminar este producto?");

  if (!confirmar) return;

  productos = productos.filter(function(p) {
    return p.id !== id;
  });

  guardarDatos();
  mostrarProductos();

  mostrarMensaje("Producto eliminado correctamente.", "Listo", "exito");
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
  document.getElementById("ventaModal").style.display = "none";
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
    if (item.codigo === codigo) {
      return total + Number(item.stockDescontar || 0);
    }
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
    lista.innerHTML = `
      <tr>
        <td colspan="6">No hay productos en la venta</td>
      </tr>
    `;
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
        <td>
          <button class="accion eliminar" onclick="quitarDeVenta(${index})">Quitar</button>
        </td>
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

  const confirmar = confirm("¿Confirmar venta por Q" + calcularTotalVentaActual().toFixed(2) + "?");

  if (!confirmar) return;

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

  guardarDatos();

  mostrarMensaje("Venta finalizada correctamente. Total: Q" + totalVenta.toFixed(2), "Venta finalizada", "exito");

  ventaActual = [];

  mostrarVentaActual();
  mostrarProductos();
  mostrarVentas();
  actualizarResumen();
}