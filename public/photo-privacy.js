const STORAGE_KEY = "galrae.hide-insect-photos.v1";

export function createPhotoPrivacy({ root, storage }) {
  let enabled = false;
  try { enabled = storage.getItem(STORAGE_KEY) === "true"; } catch {}

  function update(image) {
    const covered = enabled && image.dataset.insectPhoto === "true" && image.dataset.photoRevealed !== "true";
    const frame = image.parentElement;
    frame.classList.add("photo-frame");
    frame.setAttribute("role", "group");
    frame.setAttribute("aria-label", `${image.alt} 사진`);
    frame.classList.toggle("is-photo-covered", covered);
    let button = frame.querySelector(".photo-cover");
    if (covered && !button) {
      button = root.createElement("button");
      button.type = "button";
      button.className = "photo-cover";
      button.textContent = "사진 보기";
      button.addEventListener("pointerdown", (event) => event.stopPropagation());
      button.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") event.stopPropagation();
      });
      button.addEventListener("dragstart", (event) => { event.preventDefault(); event.stopPropagation(); });
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        image.dataset.photoRevealed = "true";
        update(image);
        frame.tabIndex = -1;
        frame.focus({ preventScroll: true });
      });
      frame.append(button);
    }
    if (button) {
      button.hidden = !covered;
      button.setAttribute("aria-label", `${image.alt} 사진 보기`);
    }
  }

  function prepare(image, animal) {
    image.dataset.insectPhoto = String(animal.taxonomy.lineage.some((taxon) => taxon.scientificName === "Insecta"));
    image.dataset.photoRevealed = "false";
    update(image);
  }

  function setEnabled(value) {
    enabled = value;
    try { storage.setItem(STORAGE_KEY, String(enabled)); } catch {}
    root.querySelectorAll("img[data-insect-photo]").forEach((image) => {
      image.dataset.photoRevealed = "false";
      update(image);
    });
  }

  return { prepare, setEnabled, get enabled() { return enabled; } };
}
