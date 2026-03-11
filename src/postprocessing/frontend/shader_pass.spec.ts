import 'jest-extended'
import {ShaderPass, ShaderError, CombinePasses, ShaderInfo} from './shader_pass'
import { Uniform, UniformType } from './uniform'
describe('Material pass tests', () => {
    it('Empty pass', () => {
        const pass = ShaderPass.fromString('')
        expect(pass).toBeInstanceOf(ShaderError)
        const err = pass as ShaderError
        expect(err.message).toBe('Expected function prototype, precision statement, prepocessor, or whitespace but end of input found.')
    })
    it('No function pass', () => {
        const pass = ShaderPass.fromString('const float pi = 3.14;')
        expect(pass).toBeInstanceOf(ShaderError)
        const err = pass as ShaderError
        expect(err.message).toBe('Shader must contain exactly one function! Instead, it has 0: []')
    })
    it('Too many functions', () => {
        const pass = ShaderPass.fromString(`
            vec3 pass1() {
                return vec3(1.0);
            }
            vec3 pass2() {
                return vec3(1.0);
            }
        `)
        expect(pass).toBeInstanceOf(ShaderError)
        const err = pass as ShaderError
        expect(err.message).toBe('Shader must contain exactly one function! Instead, it has 2: ["pass1","pass2"]')
    })
    it('Valid function - no uniforms, no input', () => {
        const pass = ShaderPass.fromString(`
            vec3 pass() {
                return texture2D(texture, vTexCoord).rgb;
            }
        `)
        expect(pass).toBeInstanceOf(ShaderPass)
        const materialPass = pass as ShaderPass
        expect(materialPass.functionName).toBe('pass')
        expect(materialPass.takesInput).toBeFalsy()
        expect(materialPass.uniformNames).toEqual([])
    })
    it('Valid function - no uniforms, takes input', () => {
        const pass = ShaderPass.fromString(`
            vec3 pass(vec3 inputColor) {
                return inputColor * 0.6 + texture2D(texture, vTexCoord).rgb * 0.4;
            }
        `)
        expect(pass).toBeInstanceOf(ShaderPass)
        const materialPass = pass as ShaderPass
        expect(materialPass.functionName).toBe('pass')
        expect(materialPass.takesInput).toBeTruthy()
        expect(materialPass.uniformNames).toEqual([])
    })
    it('Valid function - no uniforms, ignore local variable', () => {
        const pass = ShaderPass.fromString(`
            vec3 pass(vec3 inputColor) {
                vec3 color = inputColor * 0.6 + texture2D(texture, vTexCoord).rgb * 0.4;
                return color;
            }
        `)
        expect(pass).toBeInstanceOf(ShaderPass)
        const materialPass = pass as ShaderPass
        expect(materialPass.functionName).toBe('pass')
        expect(materialPass.uniformNames).toEqual([])
    })
    it('Invalid function', () => {
        const pass = ShaderPass.fromString(`
        vec3 pass(vec3 inputColor) {
            vec 3 color = inputColor * 0.6 + texture2D(texture, vTexCoord).rgb * 0.4;
            return color;
        }
    `)
    expect(pass).toBeInstanceOf(ShaderError)
    })
    it('Valid function - multiple uniforms', () => {
        const pass = ShaderPass.fromString(`
            vec3 pass(vec3 inputColor) {
                vec3 color = inputColor * 0.6 + texture2D(texture, vTexCoord + vec2(du, dv)).rgb * 0.4;
                return color;
            }
        `)
        expect(pass).toBeInstanceOf(ShaderPass)
        const materialPass = pass as ShaderPass
        expect(materialPass.functionName).toBe('pass')
        expect(materialPass.uniformNames).toIncludeSameMembers(['du', 'dv'])
    })
    it('Valid function - ignore gl_* uniforms', () => {
        const pass = ShaderPass.fromString(`
            vec3 pass(vec3 inputColor) {
                vec3 color = inputColor * 0.6 + texture2D(texture, gl_FragCoord + vTexCoord + vec2(du, dv)).rgb * 0.4;
                return color;
            }
        `)
        expect(pass).toBeInstanceOf(ShaderPass)
        const materialPass = pass as ShaderPass
        expect(materialPass.functionName).toBe('pass')
        expect(materialPass.uniformNames).toIncludeSameMembers(['du', 'dv'])
    })

    it('Multi pass - valid, first pass takes input', () => {
        const passes = [
            ShaderPass.fromString(`
            vec3 pass_one(vec3 inputColor) {
                vec3 color = inputColor * 0.6;
                return color;
            }`) as ShaderPass,
            ShaderPass.fromString(`
            vec3 pass_two(vec3 inputColor) {
                vec3 color = inputColor * 0.6;
                return color;
            }`) as ShaderPass
        ]
        const knownUniforms = new Map<string, Uniform>()
        const multiPass = CombinePasses(passes, knownUniforms)
        const shader = multiPass as ShaderInfo
        expect(shader.rawString.split('\n').map(line => line.trim()).join('\n')).toEqual(
`precision highp float;
varying vec2 vTexCoord;
// Declare all uniforms.
uniform sampler2D texture;
// Declare all functions.

vec3 pass_one(vec3 inputColor) {
vec3 color = inputColor * 0.6;
return color;
}

vec3 pass_two(vec3 inputColor) {
vec3 color = inputColor * 0.6;
return color;
}
void main() {
vec3 color = texture2D(texture, vTexCoord).rgb;
color = pass_one(color);
color = pass_two(color);
gl_FragColor = vec4(color, 1.0);
}`)
    })

    it('Multi pass - valid, first pass does not takes input', () => {
        const passes = [
            ShaderPass.fromString(`
            vec3 pass_one() {
                return texture2D(texture, vTexCoord).rgb;
            }`) as ShaderPass,
            ShaderPass.fromString(`
            vec3 pass_two(vec3 inputColor) {
                vec3 color = inputColor * 0.6;
                return color;
            }`) as ShaderPass
        ]
        const knownUniforms = new Map<string, Uniform>()
        knownUniforms.set('texture', {name:'texture', type:UniformType.TEX})
        const multiPass = CombinePasses(passes, knownUniforms)
        const shader = multiPass as ShaderInfo
        expect(shader.rawString.split('\n').map(line => line.trim()).join('\n')).toEqual(
`precision highp float;
varying vec2 vTexCoord;
// Declare all uniforms.
uniform sampler2D texture;
// Declare all functions.

vec3 pass_one() {
return texture2D(texture, vTexCoord).rgb;
}

vec3 pass_two(vec3 inputColor) {
vec3 color = inputColor * 0.6;
return color;
}
void main() {
vec3 color = pass_one();
color = pass_two(color);
gl_FragColor = vec4(color, 1.0);
}`)})

})

