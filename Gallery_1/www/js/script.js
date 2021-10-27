document.addEventListener("submit",(e)=>{
    e.preventDefault();
    const form = e.target;

    const title = form.querySelector("input[name=title]");
    if(!title) throw "Data transfer error: input[name=title] not found";

    const descr = form.querySelector("input[name=description]");
    if(!descr) throw "Data transfer error: input[name=description] not found";
    const place = form.querySelector("input[name=place]");
    if(!place) throw "Data transfer error: input[name=place] not found";
    const picture = form.querySelector("input[name=picture]");
    if(!picture) throw "Data transfer error: input[name=picture] not found";
    // TODO: data validation

    const formData = new FormData();
    formData.append("title", title.value);
    formData.append("description", descr.value);
    // place optional, include if not empty
    if(place.value.length > 0)
        formData.append("place", place.value);
    formData.append("picture", picture.files[0]);
/*
    fetch("/api/picture?" + new URLSearchParams(formData).toString(), {
        method: "GET"
    }).then(r=>r.text()).then(console.log);
    */
    fetch("/api/picture", {
        method: "POST",
        body: formData  // new URLSearchParams(formData).toString()
    }).then(r=>r.text()).then(console.log);
});

document.addEventListener("DOMContentLoaded",()=>{
    fetch("/api/picture")
    .then(r=>r.text())
    .then(t => {
        console.log(t);
        const j = JSON.parse(t);
        const cont = document.getElementById("gallery-container");
        for( let p of j ){
            /*
            const div = document.createElement("div");

            const img = document.createElement("img");
            img.src="/pictures/" + p.filename;
            img.style["max-width"]="150px";

            div.appendChild(img);
            cont.appendChild(div);
            */
             
            cont.innerHTML +=`<div>` + `<h3>${ p.title}</h3>`
            +`<img src="../pictures/${ p.filename}">`
            + `<label>${ p.description}</label>`
            +`<label>Date of upload :${ p.upload_DT}</label>`
            + `</div>`;

        }
    })
});
/*
    В случае удачной загрузки изображения вывести (добавить на страницу)
     эту картинку и описание / место (если есть) + очистить форму
    Неудачной - alert и не очищать форму
*/
