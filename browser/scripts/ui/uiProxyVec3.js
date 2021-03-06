var UIVector3 = function UIVector3(obj, propertyName, domElement, onChange, opts) {
	this.dom = {}	// reference to x, y, z controls
	this.changeIndicatorDuration = 50
	this.precision = 2
	this._enabled = true
	this.opts = opts || {}
	this.linkXYZ = false

	this.dragger = {
		x:null,
		y:null,
		z:null
	}
	UIAbstractProxy.apply(this, arguments)
}
UIVector3.prototype = Object.create(UIAbstractProxy.prototype)
UIVector3.prototype.constructor = UIVector3

UIVector3.prototype.getAdapter = function(obj, propertyName){
	var that = this
	var formatter = function(v) {
		if (isNaN(v) || (typeof v.toFixed === 'undefined')) return v
		return v.toFixed(that.precision)
	}

	var sv = obj[propertyName]
	var sourceIsThreeVec3 = (sv instanceof THREE.Vector3)

	var isVec3 = function(v) {
		if (sourceIsThreeVec3)
			return (v instanceof THREE.Vector3)
		else
			return (typeof v.x !== 'undefined') && (typeof v.y !== 'undefined') && (typeof v.z !== 'undefined')
	}
	var makeVec3 = function(x,y,z) {
		if (sourceIsThreeVec3)
			return new THREE.Vector3(x,y,z)
		else
			return {x: x, y: y, z: z}
	}
	// indicator timeouts
	var timeouts = {}
	return {
		_uiVec : { // holds uiValues with full precision
			x:0.0, y:0.0, z:0.0
		},
		get sourceValue() {
			var sv = obj[propertyName]
			if (!isVec3(sv))
				return makeVec3(sv.x, sv.y, sv.z)
			return sv
		},
		set sourceValue(v) {
			if (!isVec3(v))
				v = makeVec3(v.x, v.y, v.z)
			return obj[propertyName] = v
		},
		get uiValue() {
			return makeVec3(this._uiVec.x, this._uiVec.y, this._uiVec.z)
		},
		set uiValue(v) {
			if (typeof v.x === 'undefined') return
			this._uiVec.x = v.x
			this._uiVec.y = v.y
			this._uiVec.z = v.z
			this._updateDom()
			return v
		},
		_updateDom : function() {
			var dom = that.dom
			var changeDomPart = function(xyz) {
				var fv = formatter(this._uiVec[xyz])
				var oldText = dom[xyz].innerHTML
				if (fv !== dom[xyz].innerHTML) {
					dom[xyz].innerHTML = fv
					if (oldText) {
						dom[xyz].classList.add('changed')
						if (timeouts[xyz]) clearTimeout(timeouts[xyz])
						timeouts[xyz] = setTimeout(function () {
							if (dom[xyz]) dom[xyz].classList.remove('changed')
						}, that.changeIndicatorDuration)
					}
				}
			}.bind(this)
			changeDomPart('x')
			changeDomPart('y')
			changeDomPart('z')
		},
		get uiX() {
			var v = parseFloat(that.dom.x.innerHTML)
			return (isNaN(v)) ? 0.0 : v
		},
		set uiX(v) {
			this._uiVec.x = isNaN(v) ? 0.0 : v
			this._updateDom()
			return v
		},
		get uiY() {
			var v = parseFloat(that.dom.y.innerHTML)
			return (isNaN(v)) ? 0.0 : v
		},
		set uiY(v) {
			this._uiVec.y = isNaN(v) ? 0.0 : v
			this._updateDom()
			return v
		},
		get uiZ() {
			var v = parseFloat(that.dom.z.innerHTML)
			return (isNaN(v)) ? 0.0 : v
		},
		set uiZ(v) {
			this._uiVec.z = isNaN(v) ? 0.0 : v
			this._updateDom()
			return v
		}
	}
}

UIVector3.prototype.newElement = function() {
	var domElement = document.createElement('UL')
	var liX = document.createElement('LI'),
		liY = document.createElement('LI'),
		liZ = document.createElement('LI')

	var elX = document.createElement('SPAN'),
		elY = document.createElement('SPAN'),
		elZ = document.createElement('SPAN')

	liX.appendChild(elX)
	liY.appendChild(elY)
	liZ.appendChild(elZ)
	domElement.appendChild(liX)
	domElement.appendChild(liY)
	domElement.appendChild(liZ)

	liX.className = 'xyz-x'
	liY.className = 'xyz-y'
	liZ.className = 'xyz-z'
	domElement.className = 'xyz'

	return domElement
}

UIVector3.prototype.attach = function() {
	var that = this
	var el = this.element, adapter = this.adapter
	var spans = el.getElementsByTagName('span')
	this.dom.x = spans[0]
	this.dom.y = spans[1]
	this.dom.z = spans[2]

	var map = {
		x: 'uiX',
		y: 'uiY',
		z: 'uiZ'
	}

	function _makeParseTextInput(min, max) {
		var clamp = THREE.Math.clamp
		var ops = {
			multiply: function(v, ov) { return ov*v},
			divide: function(v,ov) { return (v !== 0) ? ov/v : ov},
			add: function(v,ov) { return ov+v},
			subtract: function(v,ov) { return ov-v}
		}
		return function(inputValue, oldValue, transient) {
			var input = inputValue
			var op = null
			if (input) {
				if (input.startsWith('++')) {
					input = input.substring(2)
					op = ops.add
				}
				else if (input.startsWith('--')) {
					input = input.substring(2)
					op = ops.subtract
				}
				else if (input.startsWith('*')) {
					input = input.substring(1)
					op = ops.multiply
				}
				else if (input.startsWith('/')) {
					input = input.substring(1)
					op = ops.divide
				}

				if (op) {
					input = parseFloat(input)
					if (isFinite(input))
						inputValue = input
					else
						op = null
				}
			}

			if (transient && op)
				return false
			
			var v = parseFloat(inputValue)
			if (isNaN(v)) return false
			if (!isFinite(v)) return false
			var newValue = clamp(v, min, max)
			return (op) ? op(newValue, oldValue) : newValue
		}
	}
	
	function enableEntry(domElement, xyz, opts) {
		if (!domElement) return
		opts = _.extend({
			min : -1000.0,
			max : 1000.0,
			step : 0.01,
			size : 100000,
			textInputParentNode : that.dom[xyz].parentNode,

			getValue : function () {
				return adapter.sourceValue[xyz]
			}
		}, opts)

		var oldValue = null, previousValue = null

		var onStart = function(){
			that.isStillChanging = true
			if (oldValue === null)
				oldValue 	= _.clone(adapter.sourceValue)

			el.dispatchEvent(new CustomEvent('beginchange', {
				detail: {
					value: oldValue,
					part: xyz
				}
			}))
		}
		var onChange = function(v, oldV, isTransient) {
			previousValue = _.clone(adapter.uiValue)
			if (oldValue === null)
				oldValue 	= _.clone(adapter.sourceValue)
			if (that.linkXYZ) {
				// xyz is 'x', 'y', or 'z'
				var ov = oldValue[xyz],
					ox = oldValue.x,
					oy = oldValue.y,
					oz = oldValue.z,
					scaleDelta,
					oldWasZeros = (ox === 0.0) && (oy === 0.0) && (oz === 0.0)

				if (!oldWasZeros) {
					// normal op
					scaleDelta = (v - oldValue[xyz]) / ov
					adapter[map.x] = oldValue.x + scaleDelta * ox
					adapter[map.y] = oldValue.y + scaleDelta * oy
					adapter[map.z] = oldValue.z + scaleDelta * oz
				} else {
					// recover from edge case
					scaleDelta = v - oldValue[xyz]
					adapter[map.x] = oldValue.x + scaleDelta
					adapter[map.y] = oldValue.y + scaleDelta
					adapter[map.z] = oldValue.z + scaleDelta
				}
			}
			else
				adapter[map[xyz]] = v

			var evt = new CustomEvent('change', {
				detail: {
					value: _.clone(adapter.uiValue),
					previousValue: previousValue,
					oldValue: oldValue,
					part: xyz,
					transient: isTransient
				}
			})
			el.dispatchEvent(evt)
		}
		var onEnd = function(){
			that.isStillChanging = false
			var e = new CustomEvent('endchange', {
				detail:{
					value: _.clone(adapter.uiValue),
					previousValue: previousValue,
					oldValue: oldValue,
					part: xyz
				}
			})
			el.dispatchEvent(e)
		}
		opts.parseTextInput = _makeParseTextInput(opts.min, opts.max)
		opts.allowTransientTextInput = true
		
		that.dragger[xyz] = uiMakeDragToAdjust(domElement, onStart, onChange, onEnd, opts)
		domElement.addEventListener('tabToNext', function(e){
			e.stopPropagation()
			var next = null
			var shiftPressed = E2 && E2.ui && E2.ui.flags.pressedShift
			switch (xyz) {
				case 'x':
					if (!shiftPressed)
						next = that.dom.y
					break
				case 'y':
					next = (shiftPressed) ? that.dom.x : that.dom.z
					break
				case 'z':
					if (shiftPressed) next = that.dom.y
					break
			}
			if (next)
				next.dispatchEvent(new CustomEvent('dblclick'))
			return false
		})
	}

	enableEntry(this.dom.x, 'x', this.opts)
	enableEntry(this.dom.y, 'y', this.opts)
	enableEntry(this.dom.z, 'z', this.opts)

	el.addEventListener('change', this._onUIChange.bind(this))
}

UIVector3.prototype.detach = function() {
	if (this.dragger.x) {
		this.dragger.x.detach()
		this.dragger.x = null
	}
	if (this.dragger.y) {
		this.dragger.y.detach()
		this.dragger.y = null
	}
	if (this.dragger.z) {
		this.dragger.z.detach()
		this.dragger.z = null
	}
	UIAbstractProxy.prototype.detach.call(this)
}
UIVector3.prototype.checkValidElement = function(domElement) {	// we want an element with three child spans
	return (domElement instanceof Element) && (domElement.getElementsByTagName('span').length = 3)
}

UIVector3.prototype.onEnabledChange = function() {
	if (this.element) {
		this.element.classList.toggle('uiEnabled',   this._enabled)
		this.element.classList.toggle('uiDisabled', !this._enabled)
	}
}

UIVector3.prototype.isEqualValue = function(v1, v2) {
	return (v1.x === v2.x) && (v1.y === v2.y) && (v1.z === v2.z)
}

UIVector3.prototype.onSourceChange = function() {
	if (this.isStillChanging) return
	UIAbstractProxy.prototype.onSourceChange.call(this)
}
