document.addEventListener("submit", (e) => {
  e.preventDefault();
  const form = e.target;

  const title = form.querySelector("input[name=title]");
  if (!title) throw "Data transfer error: input[name=title] not found";

  const descr = form.querySelector("input[name=description]");
  if (!descr) throw "Data transfer error: input[name=description] not found";
  const place = form.querySelector("input[name=place]");
  if (!place) throw "Data transfer error: input[name=place] not found";
  const picture = form.querySelector("input[name=picture]");
  if (!picture) throw "Data transfer error: input[name=picture] not found";
  // TODO: data validation

  const formData = new FormData();
  formData.append("title", title.value);
  formData.append("description", descr.value);
  // place optional, include if not empty
  if (place.value.length > 0) formData.append("place", place.value);
  formData.append("picture", picture.files[0]);
  formData.append("users_id", findUserId());
  fetch("/api/picture", {
    method: "POST",
    body: formData, // new URLSearchParams(formData).toString()
  })
    .then((r) => r.text())
    .then(console.log);
});

function findUserId() {
  // user-id (if present) -- <div... id=id="user-block" user-id="{{id_str}}" user-id="{{id_str}}"
  const userBlock = document.getElementById("user-block");
  if (userBlock) {
    const userId = userBlock.getAttribute("user-id");
    if (userId) {
      return userId;
    }
  }
  return null;
}

document.addEventListener("DOMContentLoaded", () => {
  // создаем объект galleryWindow
  let pictures_id = [];
  window.galleryWindow = {
    state: {},
    changeState: (s) => {
      if (typeof s == "undefined") return;
      const state = window.galleryWindow.state;

      if (typeof s["pageNumber"] != "undefined")
        state.pageNumber = s["pageNumber"];

      if (
        typeof s["userMode"] != "undefined" &&
        s["userMode"] != state.userMode
      ) {
        state.userMode = s["userMode"];
        state.pageNumber = 1;
      }

      var url = "/api/picture?page=" + state.pageNumber;
      if (state.userMode == 1) {
        // Own
        url += "&userid=" + findUserId();
      } else if (state.userMode == 2) {
        // Not Own
        url += "&exceptid=" + findUserId();
      } else {
        // All
      }

      fetch(url)
        .then((r) => r.text())
        .then((t) => {
          // console.log(t);
          const j = JSON.parse(t);
          const cont = document.getElementById("gallery-container");
          fetch("/templates/picture.tpl")
            .then((r) => r.text())
            .then((tpl) => {
              var html = "";
              for (let p of j.data) {
                html += tpl
                  .replace("{{id}}", p.id_str)
                  .replace("{{id}}", p.id_str)
                  .replace("{{title}}", p.title)
                  .replace("{{description}}", p.description)
                  .replace("{{place}}", p.place)
                  .replace("{{filename}}", p.filename);

                pictures_id.push(p.id_str);
              }
              cont.innerHTML = html;
              window.galleryWindow.state.pageNumber = j.meta.currentPage;
              window.galleryWindow.state.lastPage = j.meta.lastPage;
              addToolbuttonListeners();
              document.dispatchEvent(
                new CustomEvent("galleryWindowChange", {
                  detail: window.galleryWindow.state,
                })
              );
              fetch(`/api/votes?pictures_id=${JSON.stringify(pictures_id)}`, {
                method: "get",
                headers: {
                  "Content-Type": "application/json; charset=UTF-8",
                },
              })
                .then((r) => r.text())
                .then((data) => {
                  console.log(data + "\t");
                  let votes = JSON.parse(data);

                  for (let v of votes.data) {
                    try {
                      let parent = document.getElementById(`${v.picture_id}`);
                      let child = parent.querySelector(".vote");
                      let count = parseInt(child.querySelector(".vote-total").innerText);
                      count += v.vote;
                      child.querySelector(".vote-total").innerText = count;
                    } catch {}
                  }
                });
            });
        });
    },
  };
  window.galleryWindow.changeState({ pageNumber: 1, userMode: 0 });
});

async function addToolbuttonListeners() {
  for (let b of document.querySelectorAll(".tb-delete"))
    b.addEventListener("click", tbDelClick);

  for (let b of document.querySelectorAll(".tb-edit"))
    b.addEventListener("click", tbEditClick);

  for (let b of document.querySelectorAll(".tb-download"))
    b.addEventListener("click", tbDownloadClick);

  for (let b of document.querySelectorAll(".picture-addcomment"))
    b.addEventListener("click", tbAddCommentClick);

  for (let b of document.querySelectorAll(".picture-showcomment"))
    b.addEventListener("click", showCommentsClick);
}

function tbDelClick(e) {
  if (!confirm("Are you sure?")) return;

  const div = e.target.closest("div");
  const picId = div.getAttribute("picId");
  // console.log(picId);
  fetch("/api/picture", {
    method: "delete",
    headers: {
      "Content-Type": "application/json",
    },
    body: `{"id":"${picId}"}`,
  })
    .then((r) => r.json())
    .then((j) => {
      // в ответе сервера должно быть поле result, в нем (affectedRows)
      // если 1 - было удаление, 0 - не было
      if (typeof j.result == "undefined") alert("Some error");
      else if (j.result == 1) {
        // удалить div из контейнера картин
        div.remove();
        alert("Delete completed!");
      } else alert("Deleted fail");
    });
}

function tbEditClick(e) {
  const div = e.target.closest("div");
  const picId = div.getAttribute("picId");
  // console.log(picId);
  const place = div.querySelector("i");
  if (!place) throw "EditClick: place(<i>) not found";
  const descr = div.querySelector("p");
  if (!descr) throw "EditClick: description(<p>) not found";

  // toggle effect
  if (typeof div.savedPlace == "undefined") {
    // first click
    div.savedPlace = place.innerHTML;
    div.savedDecription = descr.innerHTML;
    // editable content
    place.setAttribute("contenteditable", "true");
    descr.setAttribute("contenteditable", "true");
    descr.focus();

    console.log(div.savedPlace, div.savedDecription);
  } else {
    // second click
    // no changes - no fetch
    // one field changed - one filed fetched
    let data = {};
    if (div.savedPlace != place.innerHTML) data.place = place.innerHTML;
    if (div.savedDecription != descr.innerHTML)
      data.description = descr.innerHTML;
    if (Object.keys(data).length > 0) {
      data.id = picId;
      fetch("/api/picture", {
        method: "put",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })
        .then((r) => r.text())
        .then(console.log);
    }
    delete div.savedPlace;
    delete div.savedDecription;
    place.removeAttribute("contenteditable");
    descr.removeAttribute("contenteditable");
  }
}

function tbDownloadClick(e) {
  const div = e.target.closest("div");
  const picId = div.parentElement.getAttribute("picId");
  console.log(picId);
  window.location = "/download?picid=" + picId;
}

function tbAddCommentClick(e) {
  let parent = e.target.parentElement;
  let div = parent.parentElement.querySelector(".comments");
  fetch("/templates/comment_form.tpl")
    .then((r) => r.text())
    .then((tpl) => {
      var html = "";
      html += tpl
        .replace("{{cancel_click}}", "commentCancelClick(event)")
        .replace("{{send_click}}", "commentSendButton(event)");

      div.innerHTML += html;
    });
}

function commentCancelClick(e) {
  let parent = e.target.parentElement;
  let parentOfparent = parent.parentElement;
  parentOfparent.remove();
  //comment-form
}

function commentSendButton(e) {
  const pictureId = e.target.closest("[picId]").getAttribute("picId");
  const userId = findUserId();
  let input =
    e.target.parentElement.parentElement.getElementsByTagName("input");
  let text = input[0].value;
  data = {};
  data.userId = userId;
  data.pictureId = pictureId;
  data.text = text;
  let json = JSON.stringify(data);
  fetch("/api/comments", {
    method: "post",
    headers: {
      "Content-Type": "application/json",
    },
    body: json,
  })
    .then((r) => r.text())
    .then(console.log);
}

function showCommentsClick(e) {

  const pictureId = e.target.closest("[picId]").getAttribute("picId");
  let parent = e.target.parentElement;
  let div = parent.parentElement.querySelector(".comments");

  fetch(`/api/comments?picture_id=${JSON.stringify(pictureId)}`, {
    method: "get",
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
    },
  }).then((r) => r.text())
    .then((data) => {
      console.log(data);
      const j = JSON.parse(data);
      fetch("/templates/comment.tpl")
        .then((t) => t.text())
        .then((tpl) => {
          var html = "";
          for (let p of j.data) {
            html += tpl.replace("{{id}}", p.id_str)
            .replace("{{login}}", p.login)
            .replace("{{data}}", p.date_time)
            .replace("{{text}}", p.comment);
          }
          div.innerHTML += html;
        });
    });
}

document.addEventListener("DOMContentLoaded", loadAuthContainer);

async function loadAuthContainer() {
  const authContainer = document.getElementById("auth-container");
  if (!authContainer) throw "auth-container not found";
  fetch("/templates/auth.tpl")
    .then((r) => r.text())
    .then((t) => {
      authContainer.innerHTML = t;
      authControls();
    });
}

async function authControls() {
  // user-block - auth
  const userBlock = document.getElementById("user-block");
  if (!userBlock) throw "userBlock not found";
  // button click
  const logBtn = userBlock.querySelector("input[type=button]");
  if (!logBtn) throw "logIn button not found";
  if (userBlock.classList.contains("user-block-auth")) {
    // Выход
    logBtn.addEventListener("click", () => {
      fetch(`/api/user?logout`)
        .then((r) => r.text())
        .then(loadAuthContainer);
    });
    // selector - filter <select id="filter-shown">
    const filterShown = document.getElementById("filter-shown");
    if (filterShown) {
      filterShown.addEventListener("change", filterShownChange);
    }
  } else {
    // Вход
    logBtn.addEventListener("click", () => {
      const userLogin = userBlock.querySelector("input[type=text]");
      if (!userLogin) throw "userLogin input not found";
      const userPassw = userBlock.querySelector("input[type=password]");
      if (!userPassw) throw "userPassw input not found";
      // validation
      if (userLogin.value.length == 0) {
        alert("Логин не может быть пустым");
        return;
      }
      if (userPassw.value.length == 0) {
        alert("Пароль не может быть пустым");
        return;
      }
      fetch(
        `/api/user?userlogin=${userLogin.value}&userpassw=${userPassw.value}`
      )
        .then((r) => r.text())
        .then(authUser);

      // console.log(userLogin.value, userPassw.value);
    });
  }
}

async function authUser(txt) {
  // txt = 0 | userId
  if (txt == "0") alert("Авторизация отклонена");
  else loadAuthContainer();
  // console.log(txt);
}

function filterShownChange(e) {
  window.galleryWindow.changeState({ userMode: e.target.value });
}
// --------- PAGINATION ------------
document.addEventListener("DOMContentLoaded", () => {
  const prevPageButton = document.getElementById("prevPageButton");
  if (!prevPageButton) throw "Pagination: prevPageButton not found";
  const nextPageButton = document.getElementById("nextPageButton");
  if (!nextPageButton) throw "Pagination: nextPageButton not found";
  prevPageButton.addEventListener("click", prevPageButtonClick);
  nextPageButton.addEventListener("click", nextPageButtonClick);
});
function prevPageButtonClick(e) {
  const paginationBlock = e.target.parentNode;
  // var page = paginationBlock.getAttribute("page-number");
  var page = window.galleryWindow.state.pageNumber;
  if (page > 1) {
    page--;
    //paginationBlock.setAttribute("page-number", page);
    //window.currentPageNumber.innerText = page;
    window.galleryWindow.changeState({ pageNumber: page });
  }
  // console.log(page);
}
function nextPageButtonClick(e) {
  const paginationBlock = e.target.parentNode;
  // var page = paginationBlock.getAttribute("page-number");
  var page = window.galleryWindow.state.pageNumber;
  if (page < window.galleryWindow.state.lastPage) {
    page++;
    //paginationBlock.setAttribute("page-number", page);
    //window.currentPageNumber.innerText = page;
    window.galleryWindow.changeState({ pageNumber: page });
  }
  // console.log(page);
}

function currentPageNumberListener(e) {
  window.currentPageNumber.innerText = e.detail.pageNumber;

  window.prevPageButton.removeAttribute("disabled");
  window.nextPageButton.removeAttribute("disabled");

  if (IsOnlyPage(window.galleryWindow.state.pageNumber) == true) {
    window.prevPageButton.setAttribute("disabled", "disabled");
    window.nextPageButton.setAttribute("disabled", "disabled");
  } else {
    if (IsLastPage(window.galleryWindow.state.pageNumber) == true) {
      window.nextPageButton.setAttribute("disabled", "disabled");
    } else {
      if (IsFirstPage(window.galleryWindow.state.pageNumber) == true) {
        window.prevPageButton.setAttribute("disabled", "disabled");
      } else {
        window.prevPageButton.removeAttribute("disabled");
        window.nextPageButton.removeAttribute("disabled");
      }
    }
  }
}

function IsLastPage(page) {
  if (page == window.galleryWindow.state.lastPage) {
    return true;
  } else {
    return false;
  }
}

function IsFirstPage(page) {
  if (page == 1) {
    return true;
  } else {
    return false;
  }
}

function IsOnlyPage(page) {
  if (IsLastPage(page) && IsFirstPage(page)) {
    return true;
  } else {
    return false;
  }
}
document.addEventListener("galleryWindowChange", currentPageNumberListener);

// -------- VOTES --------------
function voteHandler(e) {
  var vote = e.target.classList.contains("vote-dislike") ? -1 : 1;
  // user_id
  const userId = findUserId();
  // picture_id
  const pictureId = e.target.closest("[picId]").getAttribute("picId");
  // console.log(userId, pictureId, vote);

  data = {};
  data.userId = userId;
  data.pictureId = pictureId;
  data.vote = vote;

  let json = JSON.stringify(data);
  fetch("/api/votes", {
    method: "post",
    headers: {
      "Content-Type": "application/json",
    },
    body: json,
  })
    .then((r) => r.text())
    .then(console.log);
}
function setVotesHadlers() {
  for (let v of document.querySelectorAll(".vote-like,.vote-dislike")) {
    // element.addEventListener("click",like)
    v.onclick = voteHandler;
  }
}

document.addEventListener("galleryWindowChange", setVotesHadlers);
