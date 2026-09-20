"use client";

type Props = {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
};

export function CategorySection({ title, children, action }: Props) {
  return (
    <section className="shopping-category">
      <div className="shopping-category-head">
        <h3 className="shopping-category-title">{title}</h3>
        {action}
      </div>
      <ul className="shopping-item-list">{children}</ul>
    </section>
  );
}
