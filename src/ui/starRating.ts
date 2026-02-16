export function createStarRating(
  container: HTMLElement,
  rating: number,
  readOnly: boolean,
  onChange?: (rating: number) => void
) {
  const stars = container.createDiv({ cls: "obs-plugin-stars" });
  const starElements: HTMLSpanElement[] = [];
  let currentRating = rating;

  for (let i = 1; i <= 5; i += 1) {
    const star = stars.createEl("span", { text: "★", cls: "obs-plugin-star" });
    if (i <= rating) star.classList.add("active");
    starElements.push(star);
    if (!readOnly) {
      star.addEventListener("click", () => {
        // If clicking the same star that's already selected, reset to 0
        if (currentRating === i) {
          currentRating = 0;
          starElements.forEach((element) => {
            element.classList.remove("active");
          });
        } else {
          currentRating = i;
          starElements.forEach((element, index) => {
            element.classList.toggle("active", index < i);
          });
        }
        onChange?.(currentRating);
      });
    } else {
      star.classList.add("readonly");
    }
  }
  return stars;
}
