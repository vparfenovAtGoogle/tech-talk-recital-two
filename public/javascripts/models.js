function likeSubmission (id, user, model, submission, voter) {
  callAPI ('getModel', [user, model], 'getSubmission', [submission], 'like', [voter])
    .done (function (res) {
      var likes = res.result.getModel.getSubmission.likes
      document.getElementById (id).innerText = likes
    })
}

function openInCreo (submission) {
  alert ('TODO: openInCreo (' + submission + ')')
}