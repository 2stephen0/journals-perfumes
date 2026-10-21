Journals Perfumes — versión para Netlify

La tienda original requería un servidor Flask y SQLite. Un despliegue de archivos ZIP no ejecuta ese servidor, por lo que la página no podía cargarse. La versión publicada usa Netlify Functions para servir las páginas, Netlify Database para productos y configuración, y Netlify Blobs para las fotografías.

El despliegue instala las dependencias y aplica las migraciones del catálogo automáticamente. No requiere un comando de compilación. La carpeta pública contiene únicamente los recursos de la tienda; los archivos originales de Python se conservaron como referencia y no se publican.

Para administrar la tienda:
1. Abre Identity en el panel del proyecto de Netlify e invita tu correo.
2. Acepta la invitación y define tu contraseña en el sitio.
3. En Identity, abre el usuario y asigna el rol admin.
4. Entra en /admin/login con tu correo y contraseña.
5. Configura tu número o enlace de WhatsApp y los datos de contacto. El ZIP original no incluía estos datos.

El panel permite añadir, editar y eliminar perfumes, configurar precios e inventario y subir fotografías PNG, JPG, WEBP o GIF de hasta 4 MB. La bolsa es temporal y se conserva durante la sesión de navegación. Los pedidos se confirman por WhatsApp y no descuentan inventario automáticamente.

Para desarrollo local: npm install y netlify dev --port 8889.
Comprobación de tipos: npm run check.
