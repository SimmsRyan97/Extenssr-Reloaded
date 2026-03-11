vec3 toon(vec3 inputColor) {
    float mappedScale = clamp(22.0 - toonScale, 2.0, 20.0);
    return floor(inputColor * mappedScale) / mappedScale;
}