/* School-facing product: external session replay and identity analytics disabled.
   Keep the existing caller interface so lessons, experiments and auth keep working.
   No identifier, student profile, camera data or notebook content is transmitted. */
var Track=(function(){
  function disabled(){return false;}
  function noop(){}
  var api={load:noop,view:noop,ev:noop,tags:noop,ident:noop,upgrade:noop,enabled:disabled};
  window.PEQ_track={enabled:disabled,loaded:disabled,ev:noop,view:noop};
  return api;
})();
