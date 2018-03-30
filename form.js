var Validator = function () {

    this.filesToUpload;

    this.counter = 0;

    $('input[type=file]').on('change', prepareUpload);

    function prepareUpload(event) {
        Validator.filesToUpload = event.target.files;
        var fileNames = '';

        $.each(Validator.filesToUpload, function (key, value) {

            if (key) {
                fileNames += ', ' + value.name;
            } else {
                fileNames += value.name;
            }
        });

        $(event.target).closest('.input-group').find('input[type=hidden]').val(fileNames);
    };

    var convertErrors = function (errors) {
        var result = {};

        $.each(errors, function (index, error_list) {
            result[index] = error_list.join('<br>');
        });

        return result;

    };

    var bindAddEffect = function () {
        $.tools.validator.addEffect("labelMate", function (errors, event) {

            $.each(errors, function (index, error) {
                var $parentInputGroup = error.input.first().closest('.input-group');
                var $parentLabel = error.input.first().closest('label');
                var $errorField = error.input.first().siblings('.form-error');

                if (!$errorField.length) {
                    $errorField = $parentInputGroup.siblings('.form-error');
                }

                if ($parentInputGroup.length) {
                    $parentInputGroup.addClass('is-invalid-input');
                } else {
                    $parentLabel.addClass('is-invalid-label')
                }

                $errorField.text(error.messages[0]).addClass('is-visible');
            });

        }, function (inputs) {
            inputs.each(function () {
                var $input = $(this);
                var $parentInputGroup = $input.closest('.input-group');
                var $parentLabel = $input.closest('label');
                var $errorField = $input.siblings('.form-error');

                if (!$errorField.length) {
                    $errorField = $parentInputGroup.siblings('.form-error');
                }

                if ($parentInputGroup.length) {
                    $parentInputGroup.removeClass('is-invalid-input');
                } else {
                    $parentLabel.removeClass('is-invalid-label')
                }

                $errorField.removeClass('is-visible');
            });

        });
    };

    var getButtonOnForm = function ($form) {
        var $result = $form.find('button[type="submit"]');

        if (!$result.length) {
            $result = $('body').find('button[form="' + $form.attr('id') + '"]');
        }

        return $result;
    };

    var toggleLockForm = function ($form) {
        if ($form.hasClass('lock')) {
            $form.removeClass('lock');
            getButtonOnForm($form).removeClass('disabled');
        } else {
            $form.addClass('lock');
            getButtonOnForm($form).addClass('disabled');
        }
    };

    var removeErrorMessage = function ($form) {
        $form.find('.callout').remove();
    };

    return {
        /**
         * Функция для привязки серверной валидации к форме
         * @param elem - селектор
         * @param {Object=}options - параметры
         * @param {Number}options.delay - продолжительность показа сообщения об отправке
         * @param {String}options.success_message - текст об успехе. Приоритет -> в вёрстке -> ответ от сервера -> через этот параметр
         */
        bind            : function (elem, options) {
            $(elem).each(function () {
                    var $form = $(this);

                    options = $.extend({
                        delay: 10000
                    }, options);

                    $form.validator({effect: 'labelMate'}).submit(function (e) {

                        toggleLockForm($form);
                        removeErrorMessage($form);

                        $form.find('#CallbackForm_pageUrl').val(window.location.href);
                        $form.find('#CallbackForm_pageTitle').val(document.title);


                        if (!$form.hasClass('no-captcha')) {
                            var count = Validator.getValidateCount;

                            var recCallback = function (token) {
                                Validator.sendRequest($form, options, token);
                            };

                            $('body').append('<div id="myCaptcha' + count + '"></div>');

                            var recWidget = grecaptcha.render(('myCaptcha' + count), {
                                sitekey : '6Lcbok8UAAAAAKJg_g5rpviX3vzOoH3NnFK1SaQc',
                                'size'  : "invisible",
                                callback: recCallback
                            });

                            grecaptcha.execute(count);
                        } else {
                            Validator.sendRequest($form, options);
                        }

                        return false;
                    });
                }
            );
        },
        sendRequest     : function ($form, options, token) {

            if (!$form.hasClass('no-captcha')) {
                $form.find('input[name*="[reCaptchaResponse]"]').val(token);
            }

            var data = new FormData($form.get(0));

            data.append('title', document.title);
            data.append('url', window.location.href);

            $.ajax({
                url        : $form.attr('action'),
                data       : data,
                dataType   : 'JSON',
                processData: false,
                contentType: false,
                method     : 'POST',
                success    : function (data) {
                    if (data.error_code == 0) {
                        $form.css({
                            'height': $form.height(),
                            'width' : $form.width()
                        });
                        $('.form-error').html('');

                        if (data.result.success_message || options.success_message) {
                            $form.find('.ajax-form__message').html(options.success_message || data.result.success_message);
                        }

                        $form.find('.ajax-form__policy').fadeOut(150);
                        $form.find('.button').fadeOut(150);
                        $form.find('.ajax-form__title').fadeOut(150);
                        $form.find('.ajax-form__elements').fadeOut(150, function () {
                            $form.find('.ajax-form__message').fadeIn(150);
                        });

                        $form.find('button[type="submit"]').fadeOut(150);

                        setTimeout(function () {
                            $form.get(0).reset();
                            $form.find('.ajax-form__message').fadeOut(150, function () {
                                $form.find('.ajax-form__elements').fadeIn(150, function () {
                                    $form.css({
                                        'height': 'auto',
                                        'width' : 'auto'
                                    });
                                });
                                $form.find('.ajax-form__title').fadeIn(150);
                                $form.find('.ajax-form__policy').fadeIn(150);
                                $form.find('.button').fadeIn(150);
                                $form.find('button[type="submit"]').fadeIn(150);
                            });
                        }, options.delay)
                    }
                    else {
                        $('.form-error').html('');
                        reload.invalidate(convertErrors(data.error_messages));
                    }
                },
                error      : function () {
                    /** FIXME: указать почту саппорта */
                    /* $form.prepend('<div class="callout warning"><h5>Произошла ошибка.</h5><p>Повторите попытку позднее. В случае повторения ошибки свяжитесь с <a href="mailto:">администрацией</a></p></div>');*/
                },
                complete   : function () {
                    toggleLockForm($form);
                }
            });

            var reload = $form.data('validator');

            if (!$form.hasClass('no-captcha')) {
                Validator.setValidateCount();
            }
        },
        getValidateCount: this.counter,
        setValidateCount: function () {
            Validator.getValidateCount += 1;
        },
        init            : function () {
            bindAddEffect();
        }
    }
}();

jQuery(document).ready(function ($) {
    Validator.init();
    Validator.bind('.ajax-form');
});