function callAPIFunction (func, arg0) {
  var args = (arguments.length > 1) ? Array.prototype.slice.call(arguments, 1) : []
  return $.ajax({
      url: document.location.origin + "/api?func=" + func + "&args=" + JSON.stringify (args),
      beforeSend: function( xhr ) {
          xhr.overrideMimeType( "text/plain; charset=x-user-defined" );
      },
      dataType: "json",
      cache: false
  })
}

function callAPI () {
  return callAPIFunction ('executeQuery', Array.prototype.slice.call(arguments, 0))
}
