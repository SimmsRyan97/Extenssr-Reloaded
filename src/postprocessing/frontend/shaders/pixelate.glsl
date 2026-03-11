vec3 pixelate() {
    float mappedScale = clamp(304.0 - scaling, 4.0, 300.0);
    vec2 texCoord = vec2(ivec2(vTexCoord * mappedScale)) / mappedScale;
    texCoord.x = float(int(texCoord.x * mappedScale)) / mappedScale;
    texCoord.y = float(int(texCoord.y * mappedScale)) / mappedScale;
    return texture2D(texture, texCoord).rgb;
}
