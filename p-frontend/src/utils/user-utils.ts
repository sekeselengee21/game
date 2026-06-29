const shortenNameToTwoChars = (name: string): string => {
  if (name.length <= 2) {
    return name;
  }
  const firstChar = name.charAt(0);
  const lastChar = name.charAt(name.length - 1);
  return `${firstChar}${lastChar}`.toUpperCase();
};

export { shortenNameToTwoChars };
