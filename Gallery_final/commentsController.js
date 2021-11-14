
module.exports = {
    analyze: function( request, response ) {
        // response.setHeader('Access-Control-Allow-Origin', '*');
        const method = request.method.toUpperCase() ;
        switch( method ) {
            case 'GET'  :  
                doGet( request, response ) ;
                break ;
            case 'POST' :  
                doPost( request, response ) ;
                break ;
            case 'DELETE' :  
                doDelete( request, response ) ;
                break ;
            case 'PUT' :  
                doPut( request, response ) ;
                break ;
            case 'OPTIONS' :  
                doOptions( request, response ) ;
                break ;
        }
    }
};


function doGet(request, response) {
    
    let picture_id = JSON.parse(request.params.query.picture_id);
    let condition = `SELECT CAST(picture_id AS CHAR) picture_id, comment, date_time FROM comments WHERE picture_id ="${picture_id}" ;`;
    //let condition = `SELECT * FROM (SELECT CAST(picture_id AS CHAR) picture_id, comment, date_time , user_id JOIN users ON users.id = user_id) WHERE picture_id = ${picture_id};`;
    console.log(condition);
    request.services.dbPool.query(condition, (err, results) => {

      if (err) {

        console.log(err);
        response.errorHandlers.send500();

      } else {

        response.setHeader("Content-Type", "application/json");
        console.log(results);
        response.end(
          JSON.stringify({
            data: results,
          })
        );
      }
    });
    
}

function doPost( request, response ) {

    extractBody(request)
    .then(
        body =>{
            let userId = body.userId;
            let pictureId = body.pictureId;
            let text = body.text;
            global.services.dbPool.query(
                `INSERT comments (picture_id , user_id, comment, date_time) VALUES ( ${pictureId} ,${userId} , "${text}", CURRENT_TIMESTAMP)`,
                err => { if( err ) console.log( err ) ; }
            ) ;
        
        }
    )
    
    response.end( "POST comments works !!" ) ;
}

function doPut( request, response ) { }

function doDelete( request, response ) { }

function doOptions( request, response ) { }

function extractBody(request) {
    return new Promise((resolve, reject) => {
        requestBody = []; // массив для чанков
        request
            .on("data", chunk => requestBody.push(chunk))
            .on("end", () => { // конец получения пакета (запроса)
                try{
                    resolve(JSON.parse(
                        Buffer.concat(requestBody).toString()
                    ));
                }
                catch(ex) {
                    reject(ex);
                }
            })
    })
}