/*
 * (c) Copyright Ascensio System SIA 2010-2017
 *
 * This program is a free software product. You can redistribute it and/or
 * modify it under the terms of the GNU Affero General Public License (AGPL)
 * version 3 as published by the Free Software Foundation. In accordance with
 * Section 7(a) of the GNU AGPL its Section 15 shall be amended to the effect
 * that Ascensio System SIA expressly excludes the warranty of non-infringement
 * of any third-party rights.
 *
 * This program is distributed WITHOUT ANY WARRANTY; without even the implied
 * warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR  PURPOSE. For
 * details, see the GNU AGPL at: http://www.gnu.org/licenses/agpl-3.0.html
 *
 * You can contact Ascensio System SIA at Lubanas st. 125a-25, Riga, Latvia,
 * EU, LV-1021.
 *
 * The  interactive user interfaces in modified source and object code versions
 * of the Program must display Appropriate Legal Notices, as required under
 * Section 5 of the GNU AGPL version 3.
 *
 * Pursuant to Section 7(b) of the License you must retain the original Product
 * logo when distributing the program. Pursuant to Section 7(e) we decline to
 * grant you any rights under trademark law for use of our trademarks.
 *
 * All the Product's GUI elements, including illustrations and icon sets, as
 * well as technical writing content are licensed under the terms of the
 * Creative Commons Attribution-ShareAlike 4.0 International. See the License
 * terms at http://creativecommons.org/licenses/by-sa/4.0/legalcode
 *
*/


window.LoginDlg = function() {
    "use strict";

    var $el;
    var _tpl = '<dialog class="dlg dlg-login">' +
                  '<div class="title">'+
                    '<label class="caption">'+utils.Lang.loginTitle+'</label>'+
                    '<span class="tool close img-el"></span>'+
                  '</div>'+
                  '<div class="body">'+
                    // '<div class="logo"></div>'+
                    '<section id="box-lbl-error">'+
                      '<p id="auth-error" class="msg-error">' + utils.Lang.errLogin + '</p>' +
                    '</section>'+
                    '<input id="auth-portal" type="text" name="" spellcheck="false" class="tbox auth-control first" placeholder="'+utils.Lang.pshPortal+'" value="">' +
                    '<input id="auth-email" type="text" name="" spellcheck="false" class="tbox auth-control" placeholder="'+utils.Lang.pshEmail+'" maxlenght="255" value="">' +
                    '<input id="auth-pass" type="password" name="" spellcheck="false" class="tbox auth-control last" placeholder="'+utils.Lang.pshPass+'" maxlenght="64" value="">' +
                    '<div id="box-btn-login" class="lr-flex">'+
                      '<a id="link-restore" class="text-sub link" target="popup" href="javascript:void(0)">' + utils.Lang.linkForgotPass + '</a>'+
                      '<span />'+ 
                      '<div><img class="img-loader">' +
                      '<button id="btn-login" class="btn primary">' + utils.Lang.btnLogin + '</button></div>'+
                    '</div>'+
                    '<div class="separator"></div>'+
                    '<div style="text-align:left;">'+
                      '<a id="link-create" class="text-sub link newportal" target="popup" href="javascript:void(0)">' + utils.Lang.linkCreatePortal + '</a>'+
                    '</div>'+
                  '</div>'+
                '</dialog>';

    var protocol = 'https://',
        protarr = ['https://', 'http://'],
        startmodule = '/products/files/?desktop=true';
    var portal = undefined,
        email = undefined;
    var events = {};
    var STATUS_EXIST = 1;
    var STATUS_NOT_EXIST = 0;
    var STATUS_UNKNOWN = -1;
    var STATUS_NO_CONNECTION = -255;
    var PROD_ID = 4;

    function checkExistance(url) {
        return new Promise((resolve, reject) => {
            let _xhttp = new XMLHttpRequest();
            _xhttp.cnt = 50;

            _xhttp.onload = () => {
                clearTimeout(_abort_timer);

                switch (_xhttp.status) {
                case 0: case 401:
                case 200: resolve(STATUS_EXIST); break;
                case 404: resolve(STATUS_NOT_EXIST); break;
                default: reject(STATUS_UNKNOWN, _xhttp.statusText); break;
                }
            };

            // Handle network errors
            _xhttp.onerror = () => {
                // reject(Error("Network Error"));
                if ( --_xhttp.cnt ) setTimeout(_dorequest, 50);
                else {
                    clearTimeout(_abort_timer);
                    _abort();
                }
            };

            let _abort = (reason) => {
                _xhttp.abort();
                _xhttp = undefined;

                resolve(reason || STATUS_NOT_EXIST);
            };

            let _dorequest = () => {
                _xhttp && (_xhttp.open('GET', url, true), _xhttp.send(null));
            };

            let _abort_timer = setTimeout(_abort, 15000);
            _dorequest();
        });
    }

    function sendData(url, data, target) {
        var form = document.createElement("form");

        form.setAttribute("method", 'post');
        form.action = url;
        form.target = target.name;
        form.style.display = "none";

        for(var name in data) {
            var node = document.createElement("input");
            node.name  = name;
            node.value = data[name].toString();
            form.appendChild(node);
        }

        form.submit();
    };

    function onCloseClick(e) {
        doClose(0);
    };

    function doClose(code) {
        $el.get(0).close();
        $el.remove();

        if (events.close) {
            events.close(code);
        }
    };

    function onLoginClick(e) {
        hideLoginError();

        portal = $el.find('#auth-portal').val().trim();
        email = $el.find('#auth-email').val().trim();

        var re_wrong_symb = /[\s\\]/;
        if (!portal.length || re_wrong_symb.test(portal)) {
            showLoginError(utils.Lang.errLoginPortal, '#auth-portal');
            return;
        }

        if (!email.length || re_wrong_symb.test(email)) {
            showLoginError(utils.Lang.errLoginEmail, '#auth-email');
            return;
        }

        portal = /^(https?:\/{2})?([^\/]+)/i.exec(portal);
        if (!!portal && portal[2].length) {
            portal[1] && (protocol = portal[1]);
            portal = portal[2];
        } else {
            showLoginError(utils.Lang.errLoginPortal, '#auth-portal');
            return;
        }

        var pass = $el.find('#auth-pass').val();
        if (!pass || pass.length < 0) {
            showLoginError(utils.Lang.errLoginPass, '#auth-pass');
            return;
        }

        var url         = `${portal}/api/2.0/authentication.json`;
        var check_url   = `${portal}/api/2.0/people/@self.json`;

        let chkcallback = (r)=> {
            if (r == 0) {
                showLoginError(utils.Lang.errLoginPortal, '#auth-portal');
                // setLoaderVisible(false);
            } else 
            if (r == STATUS_NO_CONNECTION) {
                showLoginError(utils.Lang.errConnection);
            } else {
                var iframe = document.createElement("iframe");
                iframe.name = "frameLogin";
                iframe.style.display = "none";

                iframe.addEventListener("load", function () {
                    window.AscDesktopEditor.GetFrameContent("frameLogin");
                });

                document.body.appendChild(iframe);

                sendData(protocol+url, {userName: email, password: pass}, iframe);
            }
        };

        disableDialog(true);
        checkExistance(protocol + check_url)
            .then(result => {
                if ( result == 0) {
                    protocol = protocol == "https://" ? "http://" : "https://";
                    return checkExistance(protocol + check_url);
                }

                return result * 1;
            }, chkcallback)
            .then(chkcallback, chkcallback);
    };

    function showLoginError(error, el) {
        let $lbl = $el.find('#auth-error');

        !!error && $lbl.text(error);
        $lbl.fadeIn(100);

        !!el && $el.find(el).addClass('error').focus();
        disableDialog(false);
    };

    function hideLoginError() {
        $el.find('#auth-error').fadeOut(100);
        $el.find('.error').removeClass('error');
    };

    window.onchildframemessage = function(message, framename) {
        if (framename == 'frameLogin') {
            if (message.length) {
                var obj;
                try {
                    obj = JSON.parse(message);
                } catch (e) {
                    disableDialog(false);
                }

                if (obj) {
                    if (obj.statusCode == 402) {
                        showLoginError(obj.error.message);
                    } else
                    if (obj.statusCode == 500) {
                        showLoginError(utils.Lang.errLogin);
                    } else
                    if (obj.statusCode != 201) {
                        console.log('server error: ' + obj.statusCode);
                        showLoginError(utils.Lang.errLoginServer);
                    } else
                    if (obj.response.sms) {
                        showLoginError('Two-factor authentication isn\'t supported yet.');
                    } else
                    if (!obj.response.sms) {
                        Promise.all(
                            [ clientCheckin(protocol + portal, obj.response.token),
                                getUserInfo(protocol + portal, obj.response.token) ])
                            .then( results => {
                                        let info = results[1];
                                        window.sdk.setCookie(protocol + portal, portal, "/", "asc_auth_key", obj.response.token);
                                        window.on_set_cookie = ()=>{
                                            if ( !!events.success ) {
                                                let auth_info = {
                                                    portal: protocol + portal,
                                                    user: info.displayName,
                                                    email: info.email
                                                };
                                                events.success(auth_info);
                                            }

                                            window.on_set_cookie = undefined;
                                            doClose(1);
                                        }
                                },
                                error => showLoginError(utils.Lang.errLoginAuth)
                            );
                    }
                } else {
                    console.log('server error: wrong json');
                    showLoginError(utils.Lang.errLoginServer);
                }

                // setLoaderVisible(false);

                setTimeout(function(){
                    var frame = document.getElementsByName('frameLogin');
                    frame && frame.length > 0 && frame[0].remove();
                },10);
            }
        }
    };

    function getUserInfo(url, token) {
        return new Promise ((resolve, reject)=>{
            var _url = url + "/api/2.0/people/@self.json";

            var opts = {
                url: _url,
                crossOrigin: true,
                crossDomain: true,
                headers: {'Authorization': token},
                beforeSend: function (xhr) {
                    // xhr.setRequestHeader ("Access-Control-Allow-Origin", "*");
                },
                complete: function(e, status) {
                    if (status == 'success') {
                        var obj = JSON.parse(e.responseText);
                        if (obj.statusCode == 200) {
                            resolve(obj.response);
                        } else {
                            console.log('authentication error: ' + obj.statusCode);
                            reject(obj.statusCode);
                        }
                    } else {
                        console.log('authentication error: ' + status);
                        reject(status);
                    }
                },
                error: function(e, status, error) {
                    console.log('server error: ' + status + ', ' + error);
                    rejected(status);
                }
            };

            $.ajax(opts);
        });
    };

    function clientCheckin(url, token) {
        return new Promise ((resolve, reject) => {
            $.ajax({
                url: url + "/api/2.0/portal/mobile/registration",
                method: 'post',
                headers: {'Authorization': token},
                data: {type: PROD_ID}
                ,complete: function(e, status) {}
                ,error: function(e, status, error) {}
            });

            resolve();
        });
    };

    function bindEvents() {
        $el.find('.body').on('keypress', '.auth-control', 
            function(e) {
                if (e.which == 13) {
                    if (/auth-portal/.test(e.target.id)) 
                        $el.find('#auth-email').focus(); else
                    if (/auth-email/.test(e.target.id)) 
                        $el.find('#auth-pass').focus(); else
                    if (/auth-pass/.test(e.target.id)) {
                        $el.find('#btn-login').focus().click();
                    }
                }
        });

        $el.on('keyup',
            function(e) {
                if (e.which == 27) {
                    onCloseClick();
                }
        });
    };

    function disableDialog(disable) {
        $el.find('.tbox, #btn-login').prop('disabled', disable);
        $el.find('.img-loader')[disable?'show':'hide']();
    };

    function onRestorePass() {
        window.open(utils.defines.links.restorepass);
    };

    return {
        show: function(portal, email) {
            $el = $('#placeholder').append(_tpl).find('.dlg-login');

            let $p = $el.find('#auth-portal'),
                $e = $el.find('#auth-email'),
                $k = $el.find('#auth-pass');

            if (!!portal) {
                let sp = utils.getUrlProtocol(portal);
                !!sp && (protocol = sp);

                $p.val(utils.skipUrlProtocol(portal));
            }
            !!email && $e.val(email);

            // $el.width(450).height(470);
            // set height without logo
            $el.width(450).height(430);

            $el.find('.tool.close').bind('click', onCloseClick);
            $el.find('#btn-login').click(onLoginClick);
            $el.find('#link-restore').click(onRestorePass);

            bindEvents();
            $el.get(0).showModal();
            $el.addClass('scaled');

            $p.val().length > 0 ? 
                $e.val().length > 0 ? 
                    $k.focus() : $e.focus() : $p.focus();
        },
        close: function(){
            doClose(0);
        },
        onclose: function(callback) {
            if (!!callback)
                events.close = callback;
        },
        onsuccess: function(callback) {
            if (!!callback)
                events.success = callback;
        }
    };  
};

function doLogin() {

}
