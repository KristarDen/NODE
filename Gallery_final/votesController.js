
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
} ;

function doGet(request, response) {
    
  let pictures_id = JSON.parse(request.params.query.pictures_id);
  let condition = " SELECT CAST(picture_id AS CHAR) picture_id, vote FROM votes WHERE";
  for (let i = 0; i < pictures_id.length; i+=1) {
    if (i == 0) {
      condition += ` picture_id = ${pictures_id[i]}`;
    } else {
      condition += ` OR picture_id = ${pictures_id[i]}`;
    }
  }
  console.log(condition);
  request.services.dbPool.query(condition, (err, results) => {
    if (err) {
      console.log(err);
      response.errorHandlers.send500();
    } else {
      // console.log(results);
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
            let vote = body.vote
            global.services.dbPool.query(
                `INSERT votes (picture_id , user_id, date_time, vote) VALUES ( ${pictureId} ,${userId} , CURRENT_TIMESTAMP, ${vote})`,
                err => { if( err ) console.log( err ) ; }
            ) ;
        
        }
    )
    
    response.end( "POST Votes works !! user_id = , picture_id = , vote = " ) ;
}
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
function doPut( request, response ) { }

function doDelete( request, response ) { }

function doOptions( request, response ) { }
