function buildProfileAssetIcon(path, alt, iconType) {
  return `<span class="profile-section-icon profile-section-icon-${iconType}"><img src="${path}" alt="${escapeHtml(alt || "")}" loading="lazy"></span>`;
}

function profileSectionIcon(iconType) {
  const iconMap = {
    user: "/alumni-icons/svg/common/user.svg",
    briefcase: "/alumni-icons/svg/common/briefcase.svg",
    tag: "/alumni-icons/svg/common/tag.svg",
    file: "/alumni-icons/svg/common/file-text.svg",
    chart: "/alumni-icons/svg/common/chart-bar.svg",
    location: "/alumni-icons/svg/common/map-pin.svg",
    shield: "/alumni-icons/svg/common/shield.svg",
    spark: "/alumni-icons/svg/common/star.svg",
    clock: "/alumni-icons/svg/common/clock.svg"
  };
  return buildProfileAssetIcon(iconMap[iconType] || iconMap.user, iconType, iconType);
}
