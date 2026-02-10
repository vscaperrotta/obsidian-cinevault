export function renderOnboarding(
  container: HTMLElement,
  onCreate: () => void,
  onLink?: () => void
) {
  const onboarding = container.createDiv({
    cls: "cinevault-onboarding"
  });

  const actions = onboarding.createDiv({ cls: "cinevault-onboarding-actions" });
  const createButton = actions.createEl("button", { text: "Create new library" });
  createButton.addEventListener("click", onCreate);

  if (onLink) {
    actions.createEl("p", { text: "or" });
    const linkButton = actions.createEl("button", { text: "Link existing library" });
    linkButton.addEventListener("click", onLink);
  }
}