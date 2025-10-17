/**
 * TinyMCE button for Blasti Configurator shortcode
 */

(function() {
    tinymce.PluginManager.add('blasti_configurator_button', function(editor, url) {
        
        // Add button to toolbar
        editor.addButton('blasti_configurator_button', {
            title: 'Insert Blasti Configurator',
            icon: 'dashicon dashicons-admin-customizer',
            onclick: function() {
                // Open shortcode dialog
                openShortcodeDialog();
            }
        });
        
        // Function to open shortcode insertion dialog
        function openShortcodeDialog() {
            editor.windowManager.open({
                title: 'Insert Blasti 3D Configurator',
                width: 500,
                height: 400,
                body: [
                    {
                        type: 'textbox',
                        name: 'width',
                        label: 'Width',
                        value: '100%',
                        tooltip: 'Configurator width (e.g., 100%, 800px)'
                    },
                    {
                        type: 'textbox',
                        name: 'height',
                        label: 'Height',
                        value: '600px',
                        tooltip: 'Configurator height (e.g., 600px, 50vh)'
                    },
                    {
                        type: 'listbox',
                        name: 'theme',
                        label: 'Theme',
                        values: [
                            {text: 'Default', value: 'default'},
                            {text: 'Dark', value: 'dark'},
                            {text: 'Light', value: 'light'},
                            {text: 'Minimal', value: 'minimal'}
                        ],
                        value: 'default'
                    },
                    {
                        type: 'checkbox',
                        name: 'show_price',
                        label: 'Show Price Display',
                        checked: true
                    },
                    {
                        type: 'checkbox',
                        name: 'show_cart_button',
                        label: 'Show Add to Cart Button',
                        checked: true
                    },
                    {
                        type: 'checkbox',
                        name: 'show_camera_controls',
                        label: 'Show Camera Controls',
                        checked: true
                    },
                    {
                        type: 'checkbox',
                        name: 'enable_mobile',
                        label: 'Enable Mobile Support',
                        checked: true
                    },
                    {
                        type: 'textbox',
                        name: 'max_accessories',
                        label: 'Max Accessories',
                        value: '50',
                        tooltip: 'Maximum number of accessories (1-100)'
                    }
                ],
                onsubmit: function(e) {
                    // Build shortcode from form data
                    var shortcode = '[blasti_configurator';
                    
                    // Add attributes if they differ from defaults
                    if (e.data.width && e.data.width !== '100%') {
                        shortcode += ' width="' + e.data.width + '"';
                    }
                    if (e.data.height && e.data.height !== '600px') {
                        shortcode += ' height="' + e.data.height + '"';
                    }
                    if (e.data.theme && e.data.theme !== 'default') {
                        shortcode += ' theme="' + e.data.theme + '"';
                    }
                    if (!e.data.show_price) {
                        shortcode += ' show_price="false"';
                    }
                    if (!e.data.show_cart_button) {
                        shortcode += ' show_cart_button="false"';
                    }
                    if (!e.data.show_camera_controls) {
                        shortcode += ' show_camera_controls="false"';
                    }
                    if (!e.data.enable_mobile) {
                        shortcode += ' enable_mobile="false"';
                    }
                    if (e.data.max_accessories && e.data.max_accessories !== '50') {
                        shortcode += ' max_accessories="' + e.data.max_accessories + '"';
                    }
                    
                    shortcode += ']';
                    
                    // Insert shortcode into editor
                    editor.insertContent(shortcode);
                }
            });
        }
    });
})();