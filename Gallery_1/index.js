const HTTP_PORT    = 80 ;
const WWW_ROOT     = "www" ;
const FILE_404     = WWW_ROOT + "/404.html" ;
const DEFAULT_MIME = "application/octet-stream" ;
const UPLOAD_PATH  = WWW_ROOT + "/pictures/"

const http       = require( "http" ) ;       
const fs         = require( "fs" ) ;        
const formidable = require( "formidable" ) ;
const mysql      = require( 'mysql' ) ;
const crypto     = require( 'crypto' ) ;     
const mysql2     = require( 'mysql2' ) ;  

const connectionData = {
    host:     'localhost',     // размещение БД (возможно IP или hostname)
    port:     3306,            // порт 
    user:     'gallery_user',  // логин пользователя ( to 'gallery_user'@'localhost' )
    password: 'gallery_pass',  // пароль ( identified by 'gallery_pass' )
    database: 'gallery',       // schema/db  (  create database gallery; ) 
    charset:  'utf8'           // кодировка канала подключения
} ;

const services = { dbPool: null } ;

// Серверная функция
function serverFunction( request, response ) {

    services.dbPool = mysql2.createPool( connectionData ) ;
    response.on( "close", () => {
        services.dbPool.end() ;
    } ) ;

    request.params = { 
        body:  "",
        query: ""
    } ;
    analyze( request, response ) ;
}

//url controller
function analyze( request, response ) {
    console.log( request.method + " " + request.url ) ;
    
    var decodedUrl = request.url.replace( /\+/g, ' ' )  ;
    decodedUrl = decodeURIComponent( decodedUrl ) ;

    const requestParts = decodedUrl.split( "?" )  ;
    const requestUrl = requestParts[ 0 ] ;
    // вторая часть - параметры по схеме key1=val1 & key2=val2
    var params = {} ;
    if( requestParts.length > 1         
     && requestParts[1].length > 0 ) {  
        for( let keyval of requestParts[1].split( "&" ) ) {
            let pair = keyval.split( "=" ) ;
            params[ pair[0] ] = 
                typeof pair[1] == 'undefined'
                    ? null
                    : pair[1] ;
        }
    }
    console.log( params ) ;
    request.params.query = params;

    
    const restrictedParts = [ "../", ";" ] ;
    for( let part of restrictedParts ) {
        if( requestUrl.indexOf( part ) !== -1 ) {
            send418() ;
            return ;
        }
    }

   
    const path = WWW_ROOT + requestUrl ;
    if( fs.existsSync( path )  
     && fs.lstatSync( path ).isFile() ) {        
        sendFile( path, response ) ;
        return ;
    }
    
    const url = requestUrl.substring(1) ;
    request.decodedUrl = url ;
    if( url == '' ) {
        
        sendFile( "www/index.html", response ) ;
    }
    else if( url == 'db' ) {
        viewDb( request, response ) ;
    }
    else if( url == 'dbpool' ) {
        viewDbPool( request, response ) ;
    }
    else if( url == 'db2' ) {
        viewDb2( request, response ) ;
    }
    else if( url == 'auth' ) {
        viewAuth( request, response ) ;
    }
    else if( url.indexOf( "api/" ) == 0 ) {     
        processApi( request, response ) ;
        return ;
    }
    else if( url == 'allpictures' ) {
        viewPictures(  request, response );
    }
    else {
        
        sendFile( FILE_404, response, 404 ) ;  
    }
}

// Создание сервера (объект)
const server = http.createServer( serverFunction ) ;

// Запуск сервера - начало прослушивания порта
server.listen(  // регистрируемся в ОС на получение 
                // пакетов, адрессованных на наш порт 
    HTTP_PORT,  // номер порта
    () => {  // callback, после-обработчик, вызывается
             // после того, как "включится слушание"
        console.log( "Listen start, port " + HTTP_PORT ) ; 
    } 
) ;

async function sendFile2( path, response, statusCode ) {
    fs.readFile(
        path,
        ( err, data ) => {
            if( err ) {
                console.error( err ) ;
                return;
            }
            if( typeof statusCode == 'undefined' )
                statusCode = 200 ;
            response.statusCode = statusCode ;
            response.setHeader( 'Content-Type', 'text/html; charset=utf-8' ) ;
            response.end( data ) ;
        } );
}

// Stream - piping: stream copy from readable stream to writable
async function sendFile( path, response, statusCode=200 ) {
    var readStream = false ;
    if( fs.existsSync( path ) ) {
        readStream = fs.createReadStream( path ) ;
        //if( typeof statusCode == 'undefined' ) statusCode = 200 ;        
    } else if( fs.existsSync( FILE_404 ) ) {
        readStream = fs.createReadStream( FILE_404 ) ;
        statusCode = 404 ;
    }    
    
    if( readStream ) {
        response.statusCode = statusCode ;
        response.setHeader( 'Content-Type', getMimeType( path ) ) ;
        readStream.pipe( response ) ;
    } else {
        response.statusCode = 418 ;
        response.setHeader( 'Content-Type', 'text/plain' ) ;
        response.end( "I'm a teapot" ) ;
    }

    // задание: проверить наличие файла перед отправкой:
    // 1. ищем файл, если есть - отправляем
    // 2. если нет - ищем 404, отправляем (если есть)
    // 3. если нет - отправляем строку с 418 кодом
}

// returns Content-Type header value by parsing file name (path)
function getMimeType( path ) {
    // file extension
    if( ! path ) {
        return false ;
    }
    const dotPosition = path.lastIndexOf( '.' ) ;
    if( dotPosition == -1 ) {  // no extension
        return DEFAULT_MIME ;
    }
    const extension = path.substring( dotPosition + 1 ) ;
    switch( extension ) {
        case 'html' :
        case 'css'  :
            return 'text/' + extension ;
        case 'jpeg' :
        case 'jpg'  :
            return 'image/jpeg' ;
        case 'bmp'  :
        case 'gif'  :
        case 'png'  :
            return 'image/' + extension ;
        case 'json' :
        case 'pdf'  :
        case 'rtf'  :
            return 'application/' + extension ;
        default :
            return DEFAULT_MIME ;
    }
}

var res ;
// Обратка запросов   api/*
async function processApi( request, response ) {
    res = { status: "" } ;
    // принять данные формы
    // ! отключить (если есть) наш обработчик событий data/end
    
    const apiUrl = request.decodedUrl.substring( 4 ) ;  // удаляем api/ из начала
    const method = request.method.toUpperCase() ;
   
    if( apiUrl == "picture" ) {
        switch( method ) {
            case 'GET'  :  // возврат списка картин
                retPicturesList( request, response ) ;
                break ;
            case 'POST' :  // загрузка новой картины
                loadPicture( request, response ) ;
                break ;
        }        
    }
}

async function retPicturesList( request, response ) {
    // Возврать JSON данных по всем картинам
    // response.end( "Works" ) ;
    services.dbPool.query( "select * from pictures", ( err, results ) => {
        if( err ) {
            console.log( err ) ;
            send500( response ) ;
        } else {
            response.setHeader( 'Content-Type', 'application/json' ) ;
            response.end( JSON.stringify( results ) ) ;
        }
    } ) ;
}

async function loadPicture( request, response ) {
    const formParser = formidable.IncomingForm() ;
    formParser.parse( 
        request, 
        (err, fields, files) => {
            if( err ) {
                console.error( err ) ;
                send500() ;
                return ;
            }
            // console.log( fields, files ) ;
            // console.log( files["picture"] ) ;

            let validateRes = validatePictureForm( fields, files ) ;
            if( validateRes === true ) {
                // OK
                const savedName = moveUploadedFile( files.picture ) ;

                addPicture( {
                    title:       fields.title,
                    description: fields.description,
                    place:       fields.place,
                    filename:    savedName
                } )
                .then( results => {
                    res.status = results.affectedRows ;
                    response.setHeader( 'Content-Type', 'application/json' ) ;
                    response.end( JSON.stringify( res ) ) ;
                } )
                .catch( err => {
                    console.error( err ) ;
                    send500( response ) ;
                } ) ;
                // res.status = savedName ;
            } else {
                // Validation error, validateRes - message
                send412( response, validateRes ) ;
                return ;
            }
        } ) ;  
}

function addPicture( pic ) {
    /* // вариант 1
    const query = 'INSERT INTO pictures ( title, description, place, filename )' +
    `VALUES ('${pic.title}', '${pic.description}', '${pic.place}', '${pic.filename}')` ;
    services.dbPool.query( query, ( err, results ) => {
        if( err ) {
            console.error( err ) ;
        } else {
            console.log( results ) ;
        }
    } ) ; */
    // Вариант 2
    const query = "INSERT INTO pictures(title, description, place, filename) VALUES (?, ?, ?, ?)" ;
    const params = [
        pic.title, 
        pic.description, 
        pic.place, 
        pic.filename ] ;
    return new Promise( ( resolve, reject ) => {
        services.dbPool.query( query, params, ( err, results ) => {
            if( err ) reject( err ) ;
            else resolve( results ) ;
        } ) ;
    } ) ;    
}

function moveUploadedFile( file ) {
    var counter = 1 ;
    var savedName ;
    do {
        // TODO: trim filename to 64 symbols
        savedName = `(${counter++})_${file.name}` ;
    } while( fs.existsSync( UPLOAD_PATH + savedName ) ) ;
    fs.rename( file.path, UPLOAD_PATH + savedName, 
        err => { if( err ) console.log( err ) ; } ) ;
    return savedName ;
}

function validatePictureForm( fields, files ) {
    // задание: проверить поля на наличие и допустимость
    if( typeof files["picture"] == 'undefined' ) {
        return "File required" ;
    }
    // title should be
    if( typeof fields["title"] == 'undefined' ) {
        return "Title required" ;
    }
    if( fields["title"].length == 0 ) {
        return "Title should be non-empty" ;
    }
    // description should be
    if( typeof fields["description"] == 'undefined' ) {
        return "Description required" ;
    }
    if( fields["description"].length == 0 ) {
        return "Description should be non-empty" ;
    }
    // place optional. But if present then should be non-empty
    if( typeof fields["place"] != 'undefined'
     && fields["place"].length == 0 ) {
        return "Place should be non-empty" ;
    }

    return true ;
}

async function send412( response, message ) {
    response.statusCode = 412 ;
    response.setHeader( 'Content-Type', 'text/plain' ) ;
    response.end( "Precondition Failed: " + message ) ;
}

async function send418( response ) {
    // TODO: создать страницу "Опасный запрос"
    response.statusCode = 418 ;
    response.setHeader( 'Content-Type', 'text/plain' ) ;
    response.end( "I'm a teapot" ) ;
}

async function send500( response ) {
    response.statusCode = 500 ;
    response.setHeader( 'Content-Type', 'text/plain' ) ;
    response.end( "Error in server" ) ;
}

// Работа с БД
function viewDb( request, response ) {
    // создаем подключение
    const connection = mysql.createConnection( connectionData ) ;
    
    connection.connect( err => {
        if( err ) {
            console.error( err ) ;
            send500( response ) ;
        } else {
            /*// для тестовой записи в БД
            const salt = crypto.createHash( 'sha1' ).update( "321" ).digest( 'hex' ) ;
            const pass = crypto.createHash( 'sha1' ).update( "321" + salt ).digest( 'hex' ) ;
            response.end( "Connection OK " + salt + " " + pass ) ;
            */
           
            // выполнение запросов
            connection.query( "select * from users", ( err, results, fields ) => {
                if( err ) {
                    console.error( err ) ;
                    send500( response ) ;
                } else {
                    // console.log( results ) ;
                    // console.log( " ------ " ) ;
                    // console.log( fields ) ;
                    // Задание: сформировать html-таблицу с результатами запроса
                    var table = "<table border=1>" ;
                    for( let row of results )
                        table += `<tr><td>${row.id}</td><td>${row.login}</td></tr>`
                    table += "</table>" ;
                    response.end( table ) ;
                }
            } ) ;           
        }
    } ) ;
}

function viewDbPool( request, response ) {
    const pool = mysql.createPool( connectionData ) ;
    pool.query( "select * from users", 
        ( err, results, fields ) => {
        if( err ) {
            console.error( err ) ;
            send500( response ) ;
        } else {
            var table = "<table border=1 cellspacing=0>" ;
            for( let row of results )
                table += `<tr><td>${row.id}</td><td>${row.login}</td><td>${row.email}</td></tr>`
            table += "</table>" ;
            response.end( table ) ;
        }
    } ) ;
}

function viewDb2( request, response ) {
    // mysql2 - расширение mysql, поэтому поддерживает те же функции. + promiseAPI
    const pool2 = mysql2.createPool( connectionData ).promise() ;
    pool2.query( "select * from users" )
         .then( ( [ results, fields ] ) => {
            var table = "<table border=1 cellspacing=0>" ;
            for( let row of results )
                table += `<tr><td>${row.id}</td><td>${row.login}</td><td>${row.email}</td></tr>`
            table += "</table>" ;
            response.end( table ) ;
         } )
         .catch( err => { 
            console.error( err ) ;
            send500( response ) ;
         } )
}

// вывод картинок
function viewPictures(  request, response ) {
    const pool2 = mysql2.createPool( connectionData ).promise() ;
    pool2.query( "select * from pictures" )
        .then( ( [ results, fields ] ) => {

            var page = `<head><link rel="stylesheet" href="/css/style.css" /></head><body class="pictureContainer">` ;

            for( let row of results ){
                page += `<div>`;
                page += `<h3>${row.title}</h3>`;
                page += `<img src="../pictures/${row.filename}">`;
                page += `<label>${row.description}</label>`;
                page += `<label>Date of upload :${row.upload_DT}</label>`;
                page += `</div>`;
            }
            page += "</body>";
            response.setHeader( 'Content-Type', 'text/html; charset=utf-8') ;
            response.end( page );
        } )
        .catch( err => { 
            console.error( err ) ;
            send500( response ) ;
        } );
}

function viewAuth( request, response ) {
    response.end(request.params.query.login + " " +request.params.query.pass  ) ;
}
