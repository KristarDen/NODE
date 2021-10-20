//Cервер

//подключение модуля
const http = require( "http" ) ;
var path = require('path')
const HTTP_PORT  = 88;
const WWW_ROOT = "./FirstProject/www";


var fs = require('fs');

    


// серверная функция
function serverFunction( request, response) {
    console.log( request.method + " " + request.url );
    
    let path =  WWW_ROOT + request.url;

    console.log(path);
    if( fs.existsSync( path ) ){

        switch( getExtension(path) ){
            case "css":
                sendFile ( path, response, "css");
                return;
                break;

            case "js":
                sendFile ( path, response, "js");
                return;
                break;
        }
    }


    const url = request.url.substring(1) ;

    switch (url) {
        case 'hello' :
            response.end( "<h1>Hello, world<h1/>" );
            break;

        case 'js' :
            response.end( "<h1>Node is cool<h1/>" );
            break;

        case '' :
            
            sendHTML('FirstProject/www/index.html', response);
            break;

        default : 
        sendHTML('FirstProject/www/404.html', response, 404);
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

function sendFile( path, response, statusCode, fileType) {
    fs.readFile( 
        path, 
        (err, data) => {

            if(err) {
                console.error( err );
                return;
            } 

            response.statusCode = 200;
            response.setHeader( 'Content-Type', 'text/' + fileType );
            response.end(data);
        } );
}

function sendHTML( path, response, statusCode) {

    
    if( typeof statusCode == 'undefined') statusCode = 200;
    response.setHeader( 'Content-Type', 'text/html; charset=utf-8' );

    if ( fs.existsSync(path) ) {//проверка наличия файла

        const readStream = fs.createReadStream( path );
       
        readStream.pipe( response );

    } else {// проверка наличия файла 404

       if ( fs.existsSync('FirstProject/www/404.html') ){

        const readStream = fs.createReadStream( path );
        response.statusCode = 404;
        
        readStream.pipe( response );

       } else {// отправка кода 418

        response.statusCode = 418;
        response.end( "<h1>Error, code 418 <h1/>" );

       }

    }
    
}


function getExtension(filename) {
    try{
        let ext = path.extname(filename||'').split('.');
        return ext[ext.length - 1];
    } catch{
        return;
    }
    
}