var CreoJS = (function () {
    if(!window.external || !window.external.ptc) {
        alert ("This page is not running in Creo Embedded Browers.\nSome functionality will not be available")
    }
    if (typeof Promise === 'undefined') {
        Promise = (function () {
            function NOOP() {}
    
            // States:
            var PENDING = 0;
            var FULFILLED = 1;
            var REJECTED = 2;
            var ADOPTED = 3;
    
            // to avoid using try/catch inside critical functions, we
            // extract them to here.
            var LAST_ERROR = null;
            var IS_ERROR = {};
    
            function getThen(obj) {
                try {
                    return obj.then;
                } catch (ex) {
                    LAST_ERROR = ex;
                    return IS_ERROR;
                }
            }
    
            function tryCallOne(fn, a) {
                try {
                    return fn(a);
                } catch (ex) {
                    LAST_ERROR = ex;
                    return IS_ERROR;
                }
            }
    
            function tryCallTwo(fn, a, b) {
                try {
                    fn(a, b);
                } catch (ex) {
                    LAST_ERROR = ex;
                    return IS_ERROR;
                }
            }
    
            function Promise(fn) {
                if (typeof this !== 'object') {
                    throw new TypeError('Promises must be constructed via new');
                }
                if (typeof fn !== 'function') {
                    throw new TypeError('Promise constructor\'s argument is not a function');
                }
                this._deferredState = PENDING;
                this._state = PENDING;
                this._value = null;
                this._deferreds = null;
                if (fn === NOOP) return;
                doResolve(fn, this);
            }
    
            Promise._onHandle = null;
            Promise._onReject = null;
            Promise._noop = NOOP;
    
            Promise.prototype.then = function(onFulfilled, onRejected) {
                if (this.constructor !== Promise) {
                    return safeThen(this, onFulfilled, onRejected);
                }
                var res = new Promise(NOOP);
                handle(this, new Handler(onFulfilled, onRejected, res));
                return res;
            };
    
            Promise.prototype.catch = function(onRejected) {
                return this.then (undefined, onRejected);
            };
    
            Promise.prototype.finally = function(handler) {
                return this.then (handler, handler);
            };
    
            function safeThen(self, onFulfilled, onRejected) {
                return new self.constructor(function (resolve, reject) {
                    var res = new Promise(NOOP);
                    res.then(resolve, reject);
                    handle(self, new Handler(onFulfilled, onRejected, res));
                });
            }
    
            function handle(self, deferred) {
                while (self._state === ADOPTED) {
                    self = self._value;
                }
                if (Promise._onHandle) {
                    Promise._onHandle(self);
                }
                if (self._state === PENDING) {
                    if (self._deferredState === PENDING) {
                        self._deferredState = FULFILLED;
                        self._deferreds = deferred;
                        return;
                    }
                    if (self._deferredState === FULFILLED) {
                        self._deferredState = REJECTED;
                        self._deferreds = [self._deferreds, deferred];
                        return;
                    }
                    self._deferreds.push(deferred);
                    return;
                }
                handleResolved(self, deferred);
            }
    
            function handleResolved(self, deferred) {
                setTimeout(function() {
                    var cb = self._state === FULFILLED ? deferred.onFulfilled : deferred.onRejected;
                    if (cb === null) {
                    if (self._state === FULFILLED) {
                        resolve(deferred.promise, self._value);
                    } else {
                        reject(deferred.promise, self._value);
                    }
                    return;
                    }
                    var ret = tryCallOne(cb, self._value);
                    if (ret === IS_ERROR) {
                        reject(deferred.promise, LAST_ERROR);
                    } else {
                        resolve(deferred.promise, ret);
                    }
                }, 0);
            }
    
            function resolve(self, newValue) {
                // Promise Resolution Procedure: https://github.com/promises-aplus/promises-spec#the-promise-resolution-procedure
                if (newValue === self) {
                    return reject(
                        self,
                        new TypeError('A promise cannot be resolved with itself.')
                    );
                }
                if (newValue && (typeof newValue === 'object' || typeof newValue === 'function')) {
                    var then = getThen(newValue);
                    if (then === IS_ERROR) {
                        return reject(self, LAST_ERROR);
                    }
                    if (then === self.then && newValue instanceof Promise) {
                        self._state = ADOPTED;
                        self._value = newValue;
                        finale(self);
                        return;
                    } else if (typeof then === 'function') {
                        doResolve(then.bind(newValue), self);
                        return;
                    }
                }
                self._state = FULFILLED;
                self._value = newValue;
                finale(self);
            }
    
            function reject(self, newValue) {
                self._state = REJECTED;
                self._value = newValue;
                if (Promise._onReject) {
                    Promise._onReject(self, newValue);
                }
                finale(self);
            }
    
            function finale(self) {
                if (self._deferredState === FULFILLED) {
                    handle(self, self._deferreds);
                    self._deferreds = null;
                }
                if (self._deferredState === REJECTED) {
                    for (var i = 0; i < self._deferreds.length; i++) {
                        handle(self, self._deferreds[i]);
                    }
                    self._deferreds = null;
                }
            }
    
            function Handler(onFulfilled, onRejected, promise){
                this.onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : null;
                this.onRejected = typeof onRejected === 'function' ? onRejected : null;
                this.promise = promise;
            }
    
            /**
             * Take a potentially misbehaving resolver function and make sure
             * onFulfilled and onRejected are only called once.
             *
             * Makes no guarantees about asynchrony.
             */
            function doResolve(fn, promise) {
                var done = false;
                var res = tryCallTwo(fn, function (value) {
                    if (done) return;
                    done = true;
                    resolve(promise, value);
                }, function (reason) {
                    if (done) return;
                    done = true;
                    reject(promise, reason);
                });
                if (!done && res === IS_ERROR) {
                    done = true;
                    reject(promise, LAST_ERROR);
                }
            }
    
            return Promise
        }) ()
    }

    function isDebug () {
        var debugCheck = document.getElementById('creojsdebug')
        return debugCheck && debugCheck.checked
    }

    function debugPrint (msg) {
        if (isDebug ()) alert (msg)
    }
    
    function getExt (fullName) {
        var found = fullName.match (/\.([^\.\\\/]+)$/);
        if (found) {
            return found [1];
        }
        return "";
    }


    var GUID = GUID || (function() {
        var crypto = window.crypto || window.msCrypto || null; // IE11 fix

        var EMPTY = '00000000-0000-0000-0000-000000000000';

        var _padLeft = function(paddingString, width, replacementChar) {
            return paddingString.length >= width ? paddingString : _padLeft(replacementChar + paddingString, width, replacementChar || ' ');
        };

        var _s4 = function(number) {
            var hexadecimalResult = number.toString(16);
            return _padLeft(hexadecimalResult, 4, '0');
        };

        var _cryptoGuid = function() {
            var buffer = new window.Uint16Array(8);
            crypto.getRandomValues(buffer);
            return [_s4(buffer[0]) + _s4(buffer[1]), _s4(buffer[2]), _s4(buffer[3]), _s4(buffer[4]), _s4(buffer[5]) + _s4(buffer[6]) + _s4(buffer[7])].join('-');
        };

        var _guid = function() {
            var currentDateMilliseconds = new Date().getTime();
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(currentChar) {
                var randomChar = (currentDateMilliseconds + Math.random() * 16) % 16 | 0;
                currentDateMilliseconds = Math.floor(currentDateMilliseconds / 16);
                return (currentChar === 'x' ? randomChar : (randomChar & 0x7 | 0x8)).toString(16);
            });
        };

        var create = function() {
            var hasCrypto = crypto != 'undefined' && crypto !== null,
            hasRandomValues = typeof(crypto.getRandomValues) != 'undefined';
            return (hasCrypto && hasRandomValues) ? _cryptoGuid() : _guid();
        };

        return {
            newGuid: create,
            empty: EMPTY
            };
    })();

    var isLocalPage = window.location.protocol === 'file:';

    var loadTextByURL;

    if (isLocalPage) {
        loadTextByURL = function (url, textHandler, errorHandler) {
            var _loadiframe = document.createElement('iframe');
            _loadiframe.hidden = true;
            document.body.appendChild (_loadiframe);
            _loadiframe.onerror = function () {
                try {
                    if (errorHandler) {
                        errorHandler (url)
                    }
                    else {
                        alert ('Error loading ' + url);
                    }
                    textHandler (null)
                }
                catch (e) {
                    alert (e + ' while loading ' + url);
                }
                finally {
                    document.body.removeChild (_loadiframe);
                }
            }
            
            function showLoadFileFailedMessage (filename) {
                var ext = getExt (filename);
                var ErrMessage = "";
                if (ext) {
                    ErrMessage = "\nPlease check the extension '" + ext + "' of the loaded file.\n" +
                                 "Most likely you have a file-type '." + ext + "' associated with a " + 
                                 "specific program in Windows Explorer. In such case " +
                                 "we suggest removing this association and reload the page.";
                }
                alert ("Failed to load " + filename + ErrMessage);
            }
            _loadiframe.onload = function (){
                try {
                    if (_loadiframe.contentDocument.URL != "about:blank") {
                        textHandler (_loadiframe.contentDocument.body.firstChild.textContent);
                    }
                    else {
                        showLoadFileFailedMessage (_loadiframe.src);
                    }
                }
                catch (e) {
                    alert (e + ' while loading ' + url + "\nPlease check if the file exists.");
                }
                finally {
                    document.body.removeChild (_loadiframe);
                }
            };
            _loadiframe.src = url;
        }
    }
    else {
        function getXMLHttpRequest () {
            try {
                return new XMLHttpRequest();
            }
            catch (e) {
                try {
                    return new ActiveXObject("MSXML2.XMLHTTP.3.0");
                }
                catch (e) {
                    try {
                        return new ActiveXObject("MSXML2.XMLHTTP");
                    }
                    catch (e) {
                        try {
                            return new ActiveXObject("Microsoft.XMLHTTP");
                        }
                        catch(e)    {
                            alert("XMLHTTP Not Supported On Your Browser");
                        }
                    }
                }
            }
        }
        loadTextByURL = function (url, textHandler, errorHandler) {
            var xhttp = getXMLHttpRequest();
            xhttp.onerror = xhttp.onabort = function onError () {
                try {
                    if (errorHandler) {
                        errorHandler (url)
                    }
                    else {
                        alert ('Error loading ' + url);
                    }
                    textHandler (null)
                }
                catch (e) {
                    alert (e + ' while loading ' + url);
                }
            };
            xhttp.onload = function() {
                try {
                    if (this.status == 200) {
                        textHandler (this.responseText);
                    }
                    else {
                        /*
                         * See status values: https://developer.mozilla.org/en-US/docs/Web/HTTP/Status
                         */
                        alert ("Failed to load " + url + "\n" + this.statusText)
                        textHandler (null)
                    }
                }
                catch (e) {
                    alert (e + ' while loading ' + url);
                }
            };
            xhttp.open("GET", url);
            xhttp.overrideMimeType("text/raw");
            xhttp.send();
        }
    }
 
    var pageId = GUID.newGuid ();

    var callRegistry = {};
    var callCount = 0;
    
    var IsProxySupported = typeof Proxy !== 'undefined';

    var initializationStartTime = null;
    
    /*
    function buildPayloadMessage (metadata, payload)
    {
        var payloadmsg = "";
        for (var i=0; i<payload.length; i++) {
            if (i % 10 == 0) { payloadmsg += "\n"; }
            payloadmsg += payload.charCodeAt (i) + " ";
        }
        return JSON.stringify (metadata) + '\n| + payloadmsg;
    }
    */
    
    function buildPayloadMessage (payload)
    {
        var payloadmsg = "";
        if (payload) {
            for (var i=0; i<payload.length; i++) {
                if (i % 15 == 0) { payloadmsg += "\n"; }
                payloadmsg += payload.charCodeAt (i) + " ";
            }
        }
        return payloadmsg;
    }
    
    function verifyString (payload) {
        var res = {isOK: true};
        if (payload) {
            try {
                for (var i=0; i<payload.length; i++) {
                    if (payload.charCodeAt (i) == 0xffff) {
                        res.isOK = false;
                        res.position = i+1;
                        res.excerpt = payload.substring (i-45, i) + "<?>";
                        break;
                    }
                }
            }
            catch (err) {}
        }
        return res;
    } 
    
    function sendToJSEngine (command, metadata, payload) {
        metadata.client = pageId;
        metadata.command = command;
        var checkRes = verifyString (payload);
        if (checkRes.isOK) {
            window.external.ptc ('ToolkitJSBridge=v8?' + JSON.stringify (metadata) + '\n|\n' + (payload ? payload : ''));
        }
        else {
            alert ("Failed to send " + metadata.resource + ": symbol at position " + checkRes.position + "\n" + 
                checkRes.excerpt + "\n" +"Please verify this file is UTF encoded");
        }
    }

    var initialized = false
    var CREO_JS_ON_TERMINATE_SCRIPT ="if ((typeof CreoJS !== 'undefined') && CreoJS.terminate) try {CreoJS.terminate (); CreoJS = undefined;} catch (ex) {}"

    function initialize (initScript) {
        initializationStartTime = new Date ()
        sendToJSEngine ('init', {}, initScript)
        sendToJSEngine ('onterm', {}, CREO_JS_ON_TERMINATE_SCRIPT)
        var jsscripts = []
        var scripts = document.scripts
        for (var idx=0; idx < scripts.length; idx++) {
            var scriptElement = scripts [idx]
            if (scriptElement.type === 'text/creojs') {
                jsscripts.push (scriptElement)
            }
        }
        scripts = document.getElementsByTagName("creojs")
        for (var idx=0; idx < scripts.length; idx++) {
            var scriptElement = scripts [idx]
            scriptElement.style.display = 'none'
            jsscripts.push (scriptElement)
        }
        function completeInitialization () {
            if (jsscripts.length === 0) {
                sendToJSEngine ('run', {}, 'CreoJS.initialize ()')
                initialized = true
                // alert ('initialization time: ' + (new Date().getTime() - initializationStartTime.getTime()))
                initializers.forEach (function (initializer) {initializer ()})
            }
            else {
                var scriptElement = jsscripts.shift ()
                var src = scriptElement.getAttribute ('src')
                var id = scriptElement.id
                if (src && src.length > 0) {
                    if (!id || id.length == 0) id = src
                    loadScriptByUrl (src, id)
                }
                else {
                    loadScript (scriptElement.textContent, id)
                    completeInitialization ()
                }
            }
        }
        function loadScriptByUrl (src, id) {
            loadTextByURL (src, function (script) {
                if (script) loadScript (script, id)
                completeInitialization ()
            })
        }
        completeInitialization ()
    }

    var fileConsumer = null;

    function readFile (filename, consumer) {
        fileConsumer = consumer;
        if (consumer) {
            sendToJSEngine ('load', {file: filename})
        }
    }

    function writeFile (filename, content) {
        sendToJSEngine ('save', {file: filename}, content)
    }

    function loadScript (script, sourceOrigin) {
        if (!IsProxySupported) {
            //alert ("Loaded script: sourceOrigin: " + sourceOrigin)
            var functionFinder = /function[\s]+([A-Za-z_]\w+)/g
            var functionData;
            try {
                while ((functionData = functionFinder.exec(script)) !== null) {
                    var funcName = functionData [1]
                    // alert ('loading function ' + funcName)
                    connector.$ (funcName)
                    debugPrint(funcName);
                }
            }
            catch (ex) {
                alert ("exception: " + ex)
            }
        }
        sendToJSEngine ('exec', {resource: sourceOrigin}, script)
    }

    function runScript (id, script) {
        sendToJSEngine ('run', {resource: 'call.' + id, id: '' + id}, script)
    }

    function executeScript (id, script) {
        sendToJSEngine ('exec', {resource: id, id: '' + id}, script)
    }

    function processResponse (msg) {
        setTimeout (function () {
            if (msg) {
    //            debugPrint (JSON.stringify (msg))
                if (msg.line) {
                  if (connector.$ONPRINT) {
                    connector.$ONPRINT (msg.line)
                  }
                }
                if (msg.script) {
                    if (fileConsumer) {
                        fileConsumer (msg.script)
                    }
                }
                if (msg.exception) {
                    if (msg.exception.client === pageId)
                    {
                        var listener = callRegistry [msg.exception.id]
                        if (listener) {
                            if (listener.onError) {
                              listener.onError (msg.exception, listener.callTime)
                            }
                            else {
                              connector.$ONERROR (msg.exception, listener.callTime)
                            }
                            listener.onFinally (listener.callTime)
                            delete callRegistry [msg.exception.id]
                        }
                        else {
                            connector.$ONERROR (msg.exception)
                        }
                    }
                    else {
                        connector.$ONERROR (msg.exception)
                    }
                }
                if (msg.result) {
                    if (msg.result.client === pageId)
                    {
                        var listener = callRegistry [msg.result.id]
                        if (listener) {
                            if (msg.result.value.type == 'exception') {
                                if (listener.onException) {
                                    listener.onException (msg.result.value.obj, listener.callTime)
                                }
                                else {
                                    connector.$ONEXCEPTION (msg.result.value.obj, listener.callTime)
                                }
                            }
                            else if (listener.listener) {
                                listener.listener (msg.result.value.obj, listener.callTime)
                            }
                            listener.onFinally (listener.callTime)
                            delete callRegistry [msg.result.id]
                        }
                    }                             
                }
                if (msg.refresh) {
                    if (connector.$ONREFRESH) {
                        connector.$ONREFRESH (msg.refresh)
                    }
                }
                if (msg.alert) {
                    alert (msg.alert);
                }
                if ("help_request" in msg) {
                    if (connector.$ONHELP) {
                        connector.$ONHELP (msg);
                    }
                }
            }
        })
    }

    var CallPromise = function (callId, startTime) {
        var subscribed = false
        var exceptionHandlers = []
        var errorHandlers = []
        var finallyHandlers = []
        var subscribers = []
        function handleException (exc, startTime) {
            if (exceptionHandlers) {
                if (exceptionHandlers.length > 0) {
                    exceptionHandlers.forEach (function (handler) {handler (exc, startTime)})
                }
                else if (connector.$ONEXCEPTION) {
                    connector.$ONEXCEPTION (exc, startTime)
                }
            }
        }
        function handleError (err, startTime) {
            if (errorHandlers) {
                if (errorHandlers.length > 0) {
                    errorHandlers.forEach (function (handler) {handler (err, startTime)})
                }
                else if (connector.$ONEXCEPTION) {
                    connector.$ONERROR (err, startTime)
                }
            }
        }
        function handleFinally (startTime) {
            if (finallyHandlers && (finallyHandlers.length > 0)) {
                finallyHandlers.forEach (function (handler) {handler (startTime)})
            }
        }
        function NOOP (v) {return v;}
        function chainSubscriber (subscriber) {
            return function (value, startTime) {
                var startNextTime = new Date ()
                try {
                    var next = undefined
                    if (subscriber) {
                        next = subscriber (value, startTime)
                    }
                    if (!subscriber || (subscriber === NOOP)) {
                        startNextTime = startTime
                    }
                    if (subscribers.length > 0) {
                        var nextSubscriber = chainSubscriber (subscribers.shift ())
                        if (next instanceof CallPromise) {
                            next.subscribe (nextSubscriber)
                            if (exceptionHandlers) exceptionHandlers.forEach (function (handler) {next.onException (handler)})
                            if (errorHandlers) errorHandlers.forEach (function (handler) {next.onError (handler)})
                            if (finallyHandlers) finallyHandlers.forEach (function (handler) {next.finally (handler)})
                        }
                        else {
                            nextSubscriber (next, startNextTime)
                        }
                    }
                }
                catch (ex) {
                    if (ex instanceof Error) {
                        handleError (ex, startNextTime)
                    }
                    else {
                        handleException (ex, startNextTime)
                    }
                }
            }
        }
        callRegistry [callId] = {listener: chainSubscriber (NOOP), onException: handleException, onError: handleError, onFinally: handleFinally, callTime: startTime}
        this.subscribe = function (subscriber) {
            subscribers.push (subscriber)
            return this
        }
        this.then = this.subscribe
        this.onError = function (handler) {
            if (handler) {
                if (errorHandlers) errorHandlers.push (handler)
            }
            else {
                errorHandlers = null
            }
            return this
        }
        this.onException = function (handler) {
            if (handler) {
                if (exceptionHandlers) exceptionHandlers.push (handler)
            }
            else {
                exceptionHandlers = null
            }
            return this
        }
        this.finally = function (handler) {
            if (handler) {
                if (finallyHandlers) finallyHandlers.push (handler)
            }
            else {
                finallyHandlers = null
            }
            return this
        }
        this.catch = function (handler) {this.onError (handler); return this.onException (handler)}
    }

    function scriptCaller (target, name) {
        if (! (name in target)) {
            target [name] = function () {
                if (!initialized) throw new Error ('Calling CreoJS.' + name + '() before page initialization completed')
                script = "try {JSON.stringify ({type: 'return', obj:" + name + ' ('
                var sep = ''
                for (var i=0; i < arguments.length; i++) {
                    script += sep + JSON.stringify (arguments [i])
                    sep = ','
                }
                script += ")})} catch (ex) {if (ex instanceof Error) throw ex; JSON.stringify ({type: 'exception', obj:ex})}"
                var id = '' + callCount++
                var startTime = new Date ()
                runScript (id, script)
                return new CallPromise (id, startTime)
            }
        }
        return target [name]
    }

    function onPrint (line) {
        alert (line)
    }

    function onException (exc, startTime) {
        alert (JSON.stringify (exc))
    }

    function onHelp (url) {
        alert (JSON.stringify (msg));
    }

    function onError (exc, startTime) {
        var message = exc.message
        if (!message || (message.search ('Error:') < 0)) message = 'Error: ' + message
        if (exc.resource) {
            message += "\nin " + exc.resource;
            if (exc.line) {
                message += ":" + exc.line;
                if (typeof (exc.source_line_start) === "number") {
                    message += ":" + exc.source_line_start;
                }
            }
            if (exc.source_line) {
                message += "\n---------\n " + (exc.line ? exc.line+": " : "") + exc.source_line + "\n---------";
            }
        }
        var count = 1
        var traceback = exc.traceback
        if (traceback && traceback.length > 0) {
            exc.traceback.forEach (function (frame) {
                var funcname = frame.funcname
                if (funcname === '')
                    funcname = 'SCRIPT'
                else
                    funcname += ' ()'
                message += '\n' + count++ + ') ' + funcname + ' [' + frame.resource + ':' + frame.line + ':' + frame.column + ']'
            })
        }
        else {
            message = 'Error [' + exc.id + ':' + exc.line + ']: ' + exc.message
        }
        alert (message, "Application Error")
    }

    function onLoadInitialization () {
        initialize ("let CreoJS = (function () {const unloadListeners = []; const loadListeners = []; const actionListeners = []; \
            return {set onunload (value) {unloadListeners.push (value)}, \
                    set onload (value) {loadListeners.push (value)}, \
                    addListener (owner, listener) {actionListeners.push ({owner, listener}); owner.AddActionListener (listener)}, \
                    removeListener (owner, listener) {let idx = actionListeners.findIndex (e=>e.owner===owner && e.listener===listener); if (idx > -1) { \
                        owner.RemoveActionListener (listener);  actionListeners.splice (idx, 1)}}, \
                    clearListeners (owner) {let idx; while ((idx=actionListeners.findIndex (e=>!owner||e.owner===owner))>-1) { \
                        const e=actionListeners[idx]; e.owner.RemoveActionListener (e.listener);  actionListeners.splice (idx, 1)}}, \
                    initialize () {loadListeners.forEach (h => h ()); loadListeners.splice (0)}, \
                    terminate () {unloadListeners.forEach (h => h ()); unloadListeners.splice (0)}}}) ()")
    }
    
    window.addEventListener ('load', onLoadInitialization)

    function onUnloadTermination () {
        if (initialized) {
            terminators.forEach (function (terminator) {terminator ()})
            sendToJSEngine ('term', {}, CREO_JS_ON_TERMINATE_SCRIPT)
            initialized = false
        }
    }

    window.addEventListener ('unload', onUnloadTermination)

    var initializers = []

    function addInitializer (initializer) {
        if (typeof initializer === 'function') {
            if (initialized) {
                initializer ()
            }
            else {
                initializers.push (initializer)
            }
        }
        else {
            throw new Error ('Initializer is not a function')
        }
    }

    var terminators = []

    function addTerminator (terminator) {
        if (typeof terminator === 'function') {
            terminators.push (terminator)
        }
        else {
            throw new Error ('Terminator is not a function')
        }
    }

    function resetContext () {
        onUnloadTermination ()
        pageId = GUID.newGuid ()
        onLoadInitialization ()
    }

    function callBrowser (id, cb) {
        function reply (obj) {
            obj.id = id
            executeScript (id, 'Browser.$ONRETURN (' + JSON.stringify (obj) + ')')
        }
        try {
            reply ({value: cb ()})
        }
        catch (ex) {
            reply (ex instanceof Error ? {error: ex.message} : {exception: ex})
        }
    }

    var connector = {
        $: function (name) {return scriptCaller (this, name);},
        $ADD_ON_LOAD: addInitializer,
        $ADD_ON_UNLOAD: addTerminator,
        $CALLBROWSER: callBrowser,
        $EXEC: executeScript,
        $LOAD: readFile,
        $SAVE: writeFile,
        $ONPRINT: onPrint,
        $ONREFRESH: null,
        $ONEXCEPTION: onException,
        $ONERROR: onError,
        $ONHELP: onHelp,
        $ONRESPONSE: processResponse,
        $GUID: pageId,
        $RESET: resetContext,
        $INITIALIZE: function () {if (!initialized) onLoadInitialization ();},
        $LOAD_SCRIPT: function (script, origin) {loadScript (script, origin || 'dynamic');},
        $LOAD_TEXT_BY_URL: loadTextByURL,
        $LOAD_SCRIPT_BY_URL: function (url) {loadTextByURL (url, function (script) {if (script) loadScript (script, url);})}
    }
    return IsProxySupported ? new Proxy (connector, {get: scriptCaller}) : connector;
}) ();
