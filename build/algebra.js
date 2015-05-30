(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.algebra = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var Fraction = require('./fractions');
var Expression = require('./expressions');
var isInt = require('./helper').isInt;

var Equation = function(lhs, rhs) {
    if (lhs instanceof Expression) {
        this.lhs = lhs;
        if (rhs instanceof Expression) {
            this.rhs = rhs;
        } else if (rhs instanceof Fraction || isInt(rhs)) {
            this.rhs = new Expression().add(rhs);
        }
    }
};

Equation.prototype.solveFor = function(variable) {
    var newLhs = new Expression();
    var newRhs = new Expression();

    for (i = 0; i < this.rhs.terms.length; i++) {
        var term = this.rhs.terms[i];

        if (term.variable == variable) {
            newLhs = newLhs.subtract(term);
        } else {
            newRhs = newRhs.add(term);
        }
    }

    for (i = 0; i < this.lhs.terms.length; i++) {
        var term = this.lhs.terms[i];

        if (term.variable == variable) {
            newLhs = newLhs.add(term);
        } else {
            newRhs = newRhs.subtract(term);
        }
    }

    newRhs = newRhs.subtract(this.lhs.constant);
    newRhs = newRhs.add(this.rhs.constant);
    newRhs = newRhs.divide(newLhs.terms[0].coefficient);

    if (newRhs.terms.length == 0) {
        return newRhs.constant.reduce();
    }

    return newRhs;
};

Equation.prototype.print = function() {
    return this.lhs.print() + " = " + this.rhs.print();
};

Equation.prototype.tex = function() {
    return this.lhs.tex() + " = " + this.rhs.tex();
};

module.exports = Equation;
},{"./expressions":2,"./fractions":3,"./helper":4}],2:[function(require,module,exports){
var Fraction = require('./fractions');
var Term = require('./terms');
var isInt = require('./helper').isInt;

// The constant of the expression is maintained on the Expression object itself.
// Anything else is held in an array of Term objects.

var Expression = function(variable) {
    this.constant = new Fraction(0, 1);
    this.terms = (variable ? [new Term(variable)] : []);
};

Expression.prototype.copy = function() {
    var copy = new Expression('');
    copy.constant = this.constant.copy();

    var terms = [];
    this.terms.forEach(function(t) {terms.push(t.copy());} );
    copy.terms = terms;
    return copy;
};

Expression.prototype.add = function(a) {
    var copy = this.copy();

    if (a instanceof Term) {
        var exp = new Expression(a.variable).multiply(a.coefficient);
        return copy.add(exp);
    } else if (a instanceof Expression) {
        copy.constant = copy.constant.add(a.constant);
        var newTerms = a.copy().terms;

        for (i = 0; i < copy.terms.length; i++) {
            var thisTerm = copy.terms[i];

            for (j = 0; j < newTerms.length; j++) {
                var thatTerm = newTerms[j];

                if (thisTerm.hasTheSameVariableAs(thatTerm)) {
                    thisTerm.coefficient = thisTerm.coefficient.add(thatTerm.coefficient);
                    newTerms.splice(j, 1);
                }
            }
        }

        copy.terms = copy.terms.concat(newTerms);

    } else if (isInt(a) || a instanceof Fraction) {
        copy.constant = copy.constant.add(a);
    } else {
        return;
    }

    return copy;
};

Expression.prototype.subtract = function(a) {
    var copy = this.copy();
    var inverse;

    if (a instanceof Term) {
        var exp = new Expression(a.variable).multiply(a.coefficient).multiply(-1);
        return copy.add(exp);
    } else if (a instanceof Expression) {
        var newTerms = [];

        for (i = 0; i < a.terms.length; i++) {
            var t = a.terms[i].copy();
            t.coefficient = t.coefficient.multiply(-1);
            newTerms.push(t);
        }

        inverse = a.copy();
        inverse.constant = inverse.constant.multiply(-1);
        inverse.terms = newTerms;
    } else if (isInt(a)) {
        inverse = -a;
    } else if (a instanceof Fraction) {
        inverse = a.multiply(-1);
    }

    return copy.add(inverse);
};

Expression.prototype.multiply = function(a) {
    if (a instanceof Fraction || isInt(a)) {
        var copy = this.copy();

        copy.constant = copy.constant.multiply(a);

        for (i = 0; i < copy.terms.length; i++) {
            copy.terms[i].coefficient = copy.terms[i].coefficient.multiply(a);
        }

        return copy;
    }
};

Expression.prototype.divide = function(a) {
    if (a instanceof Fraction || isInt(a)) {
        if (a == 0) {
            return;
        }

        var copy = this.copy();

        copy.constant = copy.constant.divide(a);

        for (i = 0; i < copy.terms.length; i++) {
            copy.terms[i].coefficient = copy.terms[i].coefficient.divide(a);
        }

        return copy;
    }
};

Expression.prototype.evaluateAt = function(values) {
    var copy = this.copy();
    var vars = Object.keys(values);

    for (i = 0; i < copy.terms.length; i++) {
        for (j = 0; j < vars.length; j++) {
            if (copy.terms[i].variable == vars[j]) {
                copy.constant = copy.constant.add(copy.terms[i].coefficient.multiply(values[vars[j]]));
                copy.terms.splice(i, 1);
            }
        }
    }

    if (copy.terms.length == 0) {
        return copy.constant;
    }

    return copy;
};

Expression.prototype.print = function() {
    if (this.terms.length == 0) {
        return this.constant.print();
    }

    var firstTermCoefficient = this.terms[0].coefficient.reduce();
    var str = (firstTermCoefficient.numer < 0 ? "-": "") + this.terms[0].print();

    for (i = 1; i < this.terms.length; i++) {
        var coefficient = this.terms[i].coefficient.reduce();

        str += (coefficient.numer < 0 ? " - " : " + ") + this.terms[i].print();
    }

    var constant = this.constant.reduce();

    if (constant.numer) {
        str += (constant.numer < 0 ? " - " : " + ") + constant.abs().print();
    }

    return str;
};

Expression.prototype.tex = function() {
    if (this.terms.length == 0) {
        return this.constant.tex();
    }

    var firstTermCoefficient = this.terms[0].coefficient.reduce();
    var str = (firstTermCoefficient.numer < 0 ? "-": "") + this.terms[0].tex();

    for (i = 1; i < this.terms.length; i++) {
        var coefficient = this.terms[i].coefficient.reduce();

        str += (coefficient.numer < 0 ? " - " : " + ") + this.terms[i].tex();
    }

    var constant = this.constant.reduce();

    if (constant.numer) {
        str += (constant.numer < 0 ? " - " : " + ") + constant.abs().tex();
    }

    return str;
};

module.exports = Expression;
},{"./fractions":3,"./helper":4,"./terms":5}],3:[function(require,module,exports){
var isInt = require('./helper').isInt;
var gcd = require('./helper').gcd;
var lcm = require('./helper').lcm;

var Fraction = function(a, b) {
    if (isInt(a) && isInt(b) && b) {
        this.numer = a;
        this.denom = b;
    }
};

Fraction.prototype.copy = function() {
    return new Fraction(this.numer, this.denom);
};

Fraction.prototype.reduce = function() {
    var copy = this.copy();

    var g = gcd(copy.numer, copy.denom);
    copy.numer = copy.numer / g;
    copy.denom = copy.denom / g;

    if (Math.sign(copy.denom) == -1 && Math.sign(copy.numer) == 1) {
        copy.numer *= -1;
        copy.denom *= -1;
    }

    return copy;
};

Fraction.prototype.add = function(f) {
    var a, b;

    if (f instanceof Fraction) {
        a = f.numer;
        b = f.denom;
    } else if (isInt(f)) {
        a = f;
        b = 1;
    } else {
        return;
    }

    var copy = this.copy();

    if (this.denom == b) {
        copy.numer += a;
    } else {
        var m = lcm(copy.denom, b);
        var thisM = m / copy.denom;
        var otherM = m / b;

        copy.numer *= thisM;
        copy.denom *= thisM;

        a *= otherM;

        copy.numer += a;
    }

    return copy;
};

Fraction.prototype.subtract = function(f) {
    var copy = this.copy();

    if (f instanceof Fraction) {
        return copy.add(new Fraction(-f.numer, f.denom));
    } else if (isInt(f)) {
        return copy.add(new Fraction(-f, 1));
    }
};

Fraction.prototype.multiply = function(f) {
    var a, b;

    if (f instanceof Fraction) {
        a = f.numer;
        b = f.denom;
    } else if (isInt(f) && f) {
        a = f;
        b = 1;
    } else if (f == 0) {
        a = 0;
        b = 1;
    } else {
        return;
    }

    var copy = this.copy();

    copy.numer *= a;
    copy.denom *= b;

    return copy;
};

Fraction.prototype.divide = function(f) {
    if (f == 0) {
        return;
    }

    var copy = this.copy();

    if (f instanceof Fraction) {
        return copy.multiply(new Fraction(f.denom, f.numer));
    } else if (isInt(f)) {
        return copy.multiply(new Fraction(1, f));
    }
};

Fraction.prototype.abs = function() {
    var copy = this.copy();
    copy.numer = Math.abs(copy.numer);
    copy.denom = Math.abs(copy.denom);
    return copy;
};

Fraction.prototype.decimal = function() {
    return this.numer / this.denom;
};

Fraction.prototype.print = function() {
    if (this.numer == 0) {
        return "0";
    } else if (this.denom == 1) {
        return this.numer.toString();
    } else if (this.denom == -1) {
        return (-this.numer).toString();
    } else {
        return this.numer + "/" + this.denom;
    }
};

Fraction.prototype.tex = function() {
    if (this.numer == 0) {
        return "0";
    } else if (this.denom == 1) {
        return this.numer.toString();
    } else if (this.denom == -1) {
        return (-this.numer).toString();
    } else {
        return "\\frac{" + this.numer + "}{" + this.denom + "}";
    }
};

module.exports = Fraction;
},{"./helper":4}],4:[function(require,module,exports){
function gcd(x, y) {
    while (y) {
        var temp = x;
        x = y;
        y = temp % y;
    }

    return x;
}

function lcm(x, y) {
    return (x * y) / gcd(x, y);
}

function isInt(thing) {
    if (typeof thing == "number") {
        if (thing % 1 == 0) {
            return true;
        }
    }

    return false;
}

exports.gcd = gcd;
exports.lcm = lcm;
exports.isInt = isInt;
},{}],5:[function(require,module,exports){
var Fraction = require('./fractions');

var Term = function(variable) {
    this.variable = variable;
    this.coefficient = new Fraction(1, 1);
};

Term.prototype.copy = function() {
    var copy = new Term(this.variable);
    copy.coefficient = copy.coefficient.multiply(this.coefficient);
    return copy;
};

Term.prototype.hasTheSameVariableAs = function(term) {
    if (term instanceof Term) {
        if (term.variable == this.variable) {
            return true;
        }
    }

    return false;
};

// These print the absolute value of the coefficient because the plus and minus signs are handled in Expression.print.
Term.prototype.print = function() {
    var coefficient = this.coefficient.reduce();

    if (coefficient.numer == 0) {
        return "";
    } else {
        return ([1, -1].indexOf(coefficient.decimal()) > -1 ? "" : coefficient.abs().print()) + this.variable;
    }
};

Term.prototype.tex = function(type) {
    var coefficient = this.coefficient.reduce();

    if (coefficient.numer == 0) {
        return "";
    } else {
        return ([1, -1].indexOf(coefficient.decimal()) > -1 ? "" : coefficient.abs().tex()) + this.variable;
    }
};

module.exports = Term;
},{"./fractions":3}],6:[function(require,module,exports){
var Fraction = require('./src/fractions');
var Expression = require('./src/expressions');
var Equation = require('./src/equations');

module.exports = {
    Fraction: Fraction,
    Expression: Expression,
    Equation: Equation
};
},{"./src/equations":1,"./src/expressions":2,"./src/fractions":3}]},{},[6])(6)
});