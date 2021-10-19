//Cервер

//подключение модуля
const http = require( "http" ) ;
const HTTP_PORT  = 88;

// серверная функция
function serverFunction( request, response) {
    console.log( request.method + " " + request.url );
    
    const url = request.url.substring(1) ;
   /* if( url == '' || url == 'hello.js') {
        response.statusCode = 200;
        response.setHeader( 'Content-Type', 'text/html' );
        response.end( "<h1>Server works<h1/>" ); //~getWriter().print
    } else {
        response.statusCode = 404;
        response.setHeader( 'Content-Type', 'text/html' );
        response.end( "<h1>Not Found<h1/>" ); //~getWriter().print
    } */

    response.statusCode = 200;
    response.setHeader( 'Content-Type', ['text/html', 'charset=utf-8' ]);

    switch (url) {
        case 'hello' :
            response.end( "<h1>Hello, world<h1/>" );
            break;

        case 'js' :
            response.end( "<h1>Node is cool<h1/>" );
            break;

        case '' :
            response.end( "<h1>Home, sweet Home<h1/>" );
            break;

        default : 
            response.statusCode = 404;
            response.end( "<h1>Не найдено<h1/>" );
            break;
    }
    
}

//создание сервера (обьект)
const server = http.createServer( serverFunction ) ;

// Запуск сервера - начало прослушивания порта
server.listen( 
    HTTP_PORT, // номер порта 
    () => { 
        console.log("Listen start on " + HTTP_PORT + " port") ; 
    } 
) ;
