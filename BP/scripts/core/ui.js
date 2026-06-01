import { ActionFormData, ModalFormData, MessageFormData } from '@minecraft/server-ui';

export const UI = {
  // Action Form
  action(title, body = "") {
    return this.createMenu(title, body);
  },

  createMenu(title, body = "") {
    const form = new ActionFormData();
    form.title(title);
    form.body(body);
    
    // Wrapper
    const wrapper = {
      callbacks: [],
      backCallback: null,

      // Add Button
      addButton(text, arg2, arg3) {
        let iconPath = undefined;
        let callback = undefined;

        if (typeof arg2 === 'function') {
            callback = arg2;
        } else if (typeof arg2 === 'string') {
            iconPath = arg2;
            if (typeof arg3 === 'function') {
                callback = arg3;
            }
        }

        if (iconPath) {
            form.button(text, iconPath);
        } else {
            form.button(text);
        }
        
        this.callbacks.push(callback);
        return this;
      },

      // Alias
      button(text, callback) {
        return this.addButton(text, callback);
      },

      // Body Text
      body(text) {
        form.body(text);
        return this;
      },

      // Back Button Logic
      back(callback) {
        this.backCallback = callback;
        return this;
      },

      // Show
      async show(player) {
        const response = await form.show(player);

        // Handle Back/Cancel
        if (response.canceled) {
             if (this.backCallback) {
                 this.backCallback();
                 return response;
             }
             return response;
        }
        
        if (response.selection === undefined) return response;
        
        const cb = this.callbacks[response.selection];
        if (cb) cb();
        
        return response;
      },

      // Raw Form Access
      raw() { return form; }
    };
    return wrapper;
  },

  // Modal Form
  modal(title) {
    return this.createForm(title);
  },

  createForm(title) {
    const form = new ModalFormData();
    form.title(title);
    
    // Wrapper
    const wrapper = {
        _submitCallback: null,

        // Toggle
        toggle(label, defaultValue) {
            if (defaultValue !== undefined) {
                form.toggle(label, { defaultValue: defaultValue });
            } else {
                form.toggle(label);
            }
            return this;
        },

        // Text Field
        textField(label, placeholder, defaultValue) {
            if (defaultValue !== undefined) {
                form.textField(label, placeholder, { defaultValue: defaultValue });
            } else {
                form.textField(label, placeholder);
            }
            return this;
        },

        // Dropdown
        dropdown(label, options, defaultValueIndex) {
            if (defaultValueIndex !== undefined) {
                form.dropdown(label, options, { defaultValueIndex: defaultValueIndex });
            } else {
                form.dropdown(label, options);
            }
            return this;
        },

        // Slider
        slider(label, min, max, step, defaultValue) {
             const options = {};
             if (step !== undefined && step !== null) options.valueStep = step;
             if (defaultValue !== undefined && defaultValue !== null) options.defaultValue = defaultValue;

             if (Object.keys(options).length > 0) {
                 form.slider(label, min, max, options);
             } else {
                 form.slider(label, min, max);
             }
             return this;
        },

        // Submit
        submit(callback) {
            this._submitCallback = callback;
            return this;
        },

        // Show
        async show(player) {
            const response = await form.show(player);
            if (this._submitCallback) {
                this._submitCallback(response);
            }
            return response;
        }
    };
    return wrapper;
  },

  // Message Form
  message(title, body, confirmText, cancelText) {
      return this.createConfirmation(title, body, confirmText, cancelText);
  },

  createConfirmation(title, body) {
    const form = new MessageFormData();
    form.title(title);
    form.body(body);
    
    // Wrapper
    const wrapper = {
      callbacks: [],
      buttonLabels: [],

      // Add Button
      button(text, callback) {
        this.buttonLabels.push(text);
        this.callbacks.push(callback);
        return this;
      },

      // Show
      async show(player) {
        if (this.buttonLabels.length > 0) form.button1(this.buttonLabels[0]);
        if (this.buttonLabels.length > 1) form.button2(this.buttonLabels[1]);

        const response = await form.show(player);
        if (response.canceled || response.selection === undefined) return response;

        const cb = this.callbacks[response.selection];
        if (cb) cb();
        
        return response;
      }
    };
    return wrapper;
  }
};
